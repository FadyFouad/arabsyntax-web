import { describe, it, expect, vi } from 'vitest';

// The tree loaders open with `import 'server-only'`, which throws outside an
// RSC. Neutralize it so the drift guard can load the REAL asset + REAL catalog
// in vitest's node env. Hoisted above the imports below.
vi.mock('server-only', () => ({}));

const { loadTreeDefinition, getTreeLayout } = await import('@/lib/lessons/tree/loader');
const { validateTree, findUncoveredLessons } = await import('@/lib/lessons/tree/validator');
const { buildLayout } = await import('@/lib/lessons/tree/layout');
const { getAllSlugs } = await import('@/lib/lessons/loader');

// DRIFT GUARD (spec FR-004 / SC-002): the automated pre-release check that the
// shipped content/lessons/tree.json is structurally sound against the real
// lesson catalog. If someone edits the tree (JSON-only) and introduces a cycle,
// a dangling ref, an unknown lesson, or an unreachable node, this fails before
// release — exactly the guarantee the mobile spec required.

describe('lesson tree drift guard (real asset + real catalog)', () => {
  const definition = loadTreeDefinition();
  const catalog = getAllSlugs();

  it('parses with a valid shape and schemaVersion 1', () => {
    expect(definition.schemaVersion).toBe(1);
    expect(definition.nodes.length).toBeGreaterThan(0);
  });

  it('has ZERO structural violations against the catalog', () => {
    expect(validateTree(definition, catalog)).toEqual([]);
  });

  it('covers all 49 curriculum nodes with a single entry point', () => {
    expect(definition.nodes).toHaveLength(49);
    const entryPoints = definition.nodes.filter((n) => n.prerequisites.length === 0);
    expect(entryPoints.map((n) => n.id)).toEqual(['elm_alnaho']);
  });

  it('uses id === lessonId for every node (v1 invariant)', () => {
    for (const n of definition.nodes) expect(n.lessonId).toBe(n.id);
  });

  it('leaves exactly one catalog lesson uncovered — the known aqsam_feaal near-duplicate', () => {
    // Documents the anomaly (do NOT "fix" silently). If a REAL lesson ever
    // drops out of the tree, this list grows and the test fails.
    expect(findUncoveredLessons(definition, catalog)).toEqual(['aqsam_feaal']);
  });

  it('lays out into a downward DAG (7 tiers, 0..6) with no orphan edges', () => {
    const layout = buildLayout(definition);
    expect(layout.nodes).toHaveLength(49);
    const maxTier = Math.max(...layout.nodes.map((n) => n.tier));
    expect(maxTier).toBe(6);
    // Every edge points strictly downward (dependent tier > prerequisite tier).
    const tierById = new Map(layout.nodes.map((n) => [n.id, n.tier]));
    for (const e of layout.edges) {
      expect(tierById.get(e.to)!).toBeGreaterThan(tierById.get(e.from)!);
    }
  });

  it('getTreeLayout() succeeds (fail-safe path returns a layout, not null)', () => {
    expect(getTreeLayout()).not.toBeNull();
  });
});
