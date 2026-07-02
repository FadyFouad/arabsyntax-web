import { describe, it, expect } from 'vitest';
import { buildLayout } from '@/lib/lessons/tree/layout';
import type { TreeDefinition } from '@/lib/lessons/tree/schema';

// Layout is a pure function of the definition (mobile data-model §4). These
// lock the invariants the client canvas relies on: longest-path tiers (all
// edges point downward), JSON order within a tier, and wide-tier row wrapping.

const def = (nodes: TreeDefinition['nodes']): TreeDefinition => ({ schemaVersion: 1, nodes });
const node = (id: string, prerequisites: string[] = []): TreeDefinition['nodes'][number] => ({
  id,
  lessonId: id,
  title: id,
  prerequisites,
});

const tierOf = (layout: ReturnType<typeof buildLayout>, id: string) =>
  layout.nodes.find((n) => n.id === id)!.tier;

describe('buildLayout', () => {
  it('assigns tier 0 to entry points and increments by depth', () => {
    const layout = buildLayout(def([node('a'), node('b', ['a']), node('c', ['b'])]));
    expect(tierOf(layout, 'a')).toBe(0);
    expect(tierOf(layout, 'b')).toBe(1);
    expect(tierOf(layout, 'c')).toBe(2);
  });

  it('uses the LONGEST path (a node sits below its deepest prerequisite)', () => {
    // d depends on a (tier 0) and c (tier 2) → longest path wins ⇒ tier 3.
    const layout = buildLayout(def([node('a'), node('b', ['a']), node('c', ['b']), node('d', ['a', 'c'])]));
    expect(tierOf(layout, 'd')).toBe(3);
  });

  it('emits one edge per resolvable prerequisite, prereq → dependent', () => {
    const layout = buildLayout(def([node('a'), node('b', ['a'])]));
    expect(layout.edges).toEqual([{ from: 'a', to: 'b' }]);
  });

  it('preserves JSON authoring order within a tier (col follows array order)', () => {
    const layout = buildLayout(def([node('root'), node('x', ['root']), node('y', ['root'])]));
    const x = layout.nodes.find((n) => n.id === 'x')!;
    const y = layout.nodes.find((n) => n.id === 'y')!;
    expect(x.position.row).toBe(y.position.row);
    expect(x.position.col).toBe(0);
    expect(y.position.col).toBe(1);
  });

  it('wraps a tier wider than maxPerRow into extra visual rows', () => {
    const root = node('root');
    const children = ['a', 'b', 'c', 'd', 'e'].map((id) => node(id, ['root']));
    const layout = buildLayout(def([root, ...children]), 2);
    // 5 children at tier 1, maxPerRow=2 → rows for the tier: [a,b],[c,d],[e].
    const rowsForTier1 = new Set(
      layout.nodes.filter((n) => n.tier === 1).map((n) => n.position.row),
    );
    expect(rowsForTier1.size).toBe(3);
    expect(layout.columns).toBe(2); // widest row uses 2 columns
    // Each wrapped row restarts col at 0.
    const e = layout.nodes.find((n) => n.id === 'e')!;
    expect(e.position.col).toBe(0);
  });

  it('reports total rows across all tier bands', () => {
    // root (tier0, 1 row) + 3 children (tier1, maxPerRow 2 → 2 rows) = 3 rows.
    const layout = buildLayout(
      def([node('root'), node('a', ['root']), node('b', ['root']), node('c', ['root'])]),
      2,
    );
    expect(layout.rows).toBe(3);
  });

  it('never infinite-loops on an accidental cycle (guarded to tier 0)', () => {
    // The loader validates before layout, but layout must still terminate.
    const layout = buildLayout(def([node('a', ['b']), node('b', ['a'])]));
    expect(layout.nodes).toHaveLength(2);
  });

  it('ignores prerequisite refs to unknown ids when tiering and drawing edges', () => {
    const layout = buildLayout(def([node('a', ['ghost'])]));
    expect(tierOf(layout, 'a')).toBe(0);
    expect(layout.edges).toEqual([]);
  });
});
