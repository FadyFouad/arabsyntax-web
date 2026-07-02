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
 * (top→bottom); `position.col` is the 0-based slot within that row.
 *
 * O(V+E). Assumes an acyclic definition (the loader validates before calling
 * this); a `computing` guard still breaks any accidental cycle to 0 so a bad
 * definition can never infinite-loop.
 */
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

  // ── Assign grid positions, wrapping wide tiers ────────────────────────────
  const layoutNodes: LayoutNode[] = [];
  let row = 0;
  let columns = 0;
  for (const tier of [...tiers.keys()].sort((a, b) => a - b)) {
    const group = tiers.get(tier)!;
    for (let start = 0; start < group.length; start += maxPerRow) {
      const slice = group.slice(start, start + maxPerRow);
      slice.forEach((node, col) => {
        layoutNodes.push({
          id: node.id,
          lessonId: node.lessonId,
          title: node.title,
          prerequisites: node.prerequisites,
          tier,
          position: { row, col },
        });
      });
      columns = Math.max(columns, slice.length);
      row += 1;
    }
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
