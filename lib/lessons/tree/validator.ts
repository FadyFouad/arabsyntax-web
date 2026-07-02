import type { TreeDefinition, TreeNodeDefinition } from './schema';

/**
 * Pure semantic validator for a parsed tree definition (mirrors the mobile
 * `LessonTreeValidator`). Shape is already guaranteed by `treeDefinitionSchema`;
 * this enforces the GRAPH invariants a JSON schema cannot express.
 *
 * Runs in two places:
 *   1. `loadTree()` — a non-empty result makes the loader fail safe (never throw).
 *   2. The drift-guard unit test over the REAL asset + REAL catalog — the
 *      automated pre-release check (spec FR-004 / SC-002).
 *
 * No I/O, no framework deps — just the definition and the set of known lesson
 * slugs, so it is trivially unit-testable.
 */

export type TreeViolationCode =
  | 'duplicate_id'
  | 'unknown_lesson'
  | 'dangling_prerequisite'
  | 'self_prerequisite'
  | 'cycle'
  | 'unreachable';

export interface TreeViolation {
  code: TreeViolationCode;
  /** Node id the violation concerns. */
  ref: string;
  message: string;
}

/**
 * Validate a tree definition against the lesson catalog.
 *
 * @param definition parsed tree (shape already validated)
 * @param catalogSlugs every lesson slug that exists in the catalog
 * @returns an array of violations; empty means the tree is valid
 */
export function validateTree(
  definition: TreeDefinition,
  catalogSlugs: Iterable<string>,
): TreeViolation[] {
  const violations: TreeViolation[] = [];
  const nodes = definition.nodes;
  const catalog = new Set(catalogSlugs);

  // ── Duplicate ids ─────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const ids = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.id)) {
      violations.push({
        code: 'duplicate_id',
        ref: node.id,
        message: `Duplicate node id "${node.id}".`,
      });
    }
    seen.add(node.id);
    ids.add(node.id);
  }

  const byId = new Map<string, TreeNodeDefinition>();
  for (const node of nodes) if (!byId.has(node.id)) byId.set(node.id, node);

  // ── Unknown lesson refs + prerequisite integrity ─────────────────────────
  for (const node of nodes) {
    if (!catalog.has(node.lessonId)) {
      violations.push({
        code: 'unknown_lesson',
        ref: node.id,
        message: `Node "${node.id}" references unknown lesson "${node.lessonId}".`,
      });
    }
    for (const prereq of node.prerequisites) {
      if (prereq === node.id) {
        violations.push({
          code: 'self_prerequisite',
          ref: node.id,
          message: `Node "${node.id}" lists itself as a prerequisite.`,
        });
      } else if (!ids.has(prereq)) {
        violations.push({
          code: 'dangling_prerequisite',
          ref: node.id,
          message: `Node "${node.id}" has prerequisite "${prereq}" which is not a node.`,
        });
      }
    }
  }

  // ── Cycle detection (DFS over resolvable edges) ───────────────────────────
  // WHITE=unvisited, GRAY=on the current stack, BLACK=done. A GRAY→GRAY edge
  // is a back-edge ⇒ cycle. Skip edges to unknown ids (already flagged above).
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const id of ids) color.set(id, WHITE);
  const cyclic = new Set<string>();

  const visit = (id: string): void => {
    color.set(id, GRAY);
    for (const prereq of byId.get(id)?.prerequisites ?? []) {
      if (!ids.has(prereq)) continue;
      const c = color.get(prereq);
      if (c === GRAY) {
        cyclic.add(prereq);
      } else if (c === WHITE) {
        visit(prereq);
      }
    }
    color.set(id, BLACK);
  };
  for (const id of ids) if (color.get(id) === WHITE) visit(id);
  for (const id of cyclic) {
    violations.push({
      code: 'cycle',
      ref: id,
      message: `Node "${id}" participates in a prerequisite cycle.`,
    });
  }

  // ── Reachability from entry points (nodes with no prerequisites) ──────────
  // Only meaningful when the graph is acyclic; a cycle already fails the tree.
  if (!cyclic.size) {
    const dependents = new Map<string, string[]>();
    for (const id of ids) dependents.set(id, []);
    for (const node of nodes) {
      for (const prereq of node.prerequisites) {
        if (ids.has(prereq)) dependents.get(prereq)!.push(node.id);
      }
    }
    const reachable = new Set<string>();
    const queue: string[] = [];
    for (const node of nodes) {
      if (node.prerequisites.length === 0 && !reachable.has(node.id)) {
        reachable.add(node.id);
        queue.push(node.id);
      }
    }
    while (queue.length) {
      const id = queue.shift()!;
      for (const dep of dependents.get(id) ?? []) {
        if (!reachable.has(dep)) {
          reachable.add(dep);
          queue.push(dep);
        }
      }
    }
    for (const id of ids) {
      if (!reachable.has(id)) {
        violations.push({
          code: 'unreachable',
          ref: id,
          message: `Node "${id}" is not reachable from any entry point.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Catalog lessons that have no node in the tree (spec FR-003 coverage check).
 *
 * Warning-level, NOT a fail-safe trigger: a lesson can legitimately exist in
 * the catalog without a tree node (spec edge case — it stays reachable through
 * the list, unaffected). The web catalog currently has one such lesson,
 * `aqsam_feaal` (a near-duplicate of `aqsam_alfeal`). The drift-guard test
 * asserts this stays the ONLY uncovered lesson so real gaps still surface.
 */
export function findUncoveredLessons(
  definition: TreeDefinition,
  catalogSlugs: Iterable<string>,
): string[] {
  const covered = new Set(definition.nodes.map((n) => n.lessonId));
  return [...new Set(catalogSlugs)].filter((slug) => !covered.has(slug));
}
