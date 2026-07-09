import type { TreeDefinition, TreeNodeDefinition } from './schema';
import type { LayoutNode, TreeEdge, TreeLayout } from './types';
import { MAX_NODES_PER_ROW } from './constants';

/**
 * Pure, deterministic layered layout (mirrors mobile research R3 / data-model §4).
 *
 * Tier = longest-path depth: `tier(n) = 0` for entry points, else
 * `1 + max(tier(prereq))`. Longest-path (not BFS shortest-path) guarantees
 * every edge points strictly downward — no upward/sideways connectors to route.
 *
 * Within a tier, nodes keep their JSON authoring order (rendered right→left by
 * the RTL client). A tier with more than `maxPerRow` nodes wraps into extra
 * visual rows inside its band. `position.row` is a global visual-row index
 * (top→bottom); `position.col` is a (possibly fractional) horizontal slot.
 *
 * Columns are barycentric, like the mobile tree: each node wants the mean
 * column of its prerequisites, a left-to-right pass keeps authoring order and a
 * minimum gap of 1 slot, and the whole row then shifts uniformly so it stays
 * centred on those targets (rows with no prerequisites centre on 0). A final
 * normalisation slides everything so the leftmost node sits at col 0 — so
 * children hang centred under their parents instead of packing left.
 *
 * O(V+E). Assumes an acyclic definition (the loader validates before calling
 * this); a `computing` guard still breaks any accidental cycle to 0 so a bad
 * definition can never infinite-loop.
 */
const round3 = (n: number) => Math.round(n * 1000) / 1000;
export function buildLayout(
  definition: TreeDefinition,
  maxPerRow: number = MAX_NODES_PER_ROW,
): TreeLayout {
  const nodes = definition.nodes;
  const byId = new Map<string, TreeNodeDefinition>();
  for (const node of nodes) if (!byId.has(node.id)) byId.set(node.id, node);

  // ── Longest-path tier, memoized ───────────────────────────────────────────
  const tierMemo = new Map<string, number>();
  const computing = new Set<string>();
  const tierOf = (id: string): number => {
    const memo = tierMemo.get(id);
    if (memo !== undefined) return memo;
    if (computing.has(id)) return 0; // cycle guard — never recurse forever
    computing.add(id);
    let tier = 0;
    for (const prereq of byId.get(id)?.prerequisites ?? []) {
      if (byId.has(prereq)) tier = Math.max(tier, 1 + tierOf(prereq));
    }
    computing.delete(id);
    tierMemo.set(id, tier);
    return tier;
  };

  // ── Group by tier, preserving JSON authoring order within each tier ───────
  const tiers = new Map<number, TreeNodeDefinition[]>();
  for (const node of nodes) {
    const tier = tierOf(node.id);
    const group = tiers.get(tier);
    if (group) group.push(node);
    else tiers.set(tier, [node]);
  }

  // ── Assign positions: barycentric columns, wrapping wide tiers ────────────
  const layoutNodes: LayoutNode[] = [];
  const colOf = new Map<string, number>();
  let row = 0;
  for (const tier of [...tiers.keys()].sort((a, b) => a - b)) {
    const group = tiers.get(tier)!;
    for (let start = 0; start < group.length; start += maxPerRow) {
      const slice = group.slice(start, start + maxPerRow);

      // Where each node wants to sit: the mean column of its (already placed —
      // prerequisites always live in earlier rows) prerequisites. Tier-0 nodes
      // have none and yield null.
      const desired = slice.map((node) => {
        const anchors = node.prerequisites.filter((p) => colOf.has(p));
        if (anchors.length === 0) return null;
        return anchors.reduce((sum, p) => sum + colOf.get(p)!, 0) / anchors.length;
      });

      // Left-to-right pass: honor the desire when possible, but keep authoring
      // order and at least 1 slot between neighbours.
      const pos: number[] = [];
      slice.forEach((_, i) => {
        if (i === 0) {
          pos.push(desired[0] ?? 0);
        } else {
          const floor = pos[i - 1] + 1;
          pos.push(Math.max(desired[i] ?? floor, floor));
        }
      });

      // Uniform shift, so the pass above never drags the row off target: match
      // the row's mean to the desired mean (least-squares optimum for a rigid
      // row), or centre a desire-less (tier-0) row on 0.
      const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      const targets = desired.filter((d): d is number => d !== null);
      const shift = (targets.length ? mean(targets) : 0) - mean(pos);

      slice.forEach((node, i) => {
        const col = round3(pos[i] + shift);
        colOf.set(node.id, col);
        layoutNodes.push({
          id: node.id,
          lessonId: node.lessonId,
          title: node.title,
          prerequisites: node.prerequisites,
          tier,
          position: { row, col },
        });
      });
      row += 1;
    }
  }

  // ── Normalise: leftmost node at col 0; columns spans the used width ───────
  const minCol = Math.min(0, ...layoutNodes.map((n) => n.position.col));
  let columns = 0;
  for (const node of layoutNodes) {
    node.position.col = round3(node.position.col - minCol);
    columns = Math.max(columns, node.position.col + 1);
  }

  // ── Edges: prerequisite → dependent (skip refs to unknown ids) ────────────
  const edges: TreeEdge[] = [];
  for (const node of nodes) {
    for (const prereq of node.prerequisites) {
      if (byId.has(prereq)) edges.push({ from: prereq, to: node.id });
    }
  }

  return { nodes: layoutNodes, edges, rows: row, columns };
}
