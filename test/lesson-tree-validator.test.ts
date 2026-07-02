import { describe, it, expect } from 'vitest';
import { validateTree, findUncoveredLessons } from '@/lib/lessons/tree/validator';
import type { TreeDefinition } from '@/lib/lessons/tree/schema';

// The validator is the fail-safe gate (spec FR-004): it turns a broken
// curriculum definition into a friendly error instead of a crash, and backs the
// pre-release drift guard (SC-002). Each graph invariant gets an explicit case
// so a regression in one check can't hide behind another.

const def = (nodes: TreeDefinition['nodes']): TreeDefinition => ({ schemaVersion: 1, nodes });
const node = (
  id: string,
  prerequisites: string[] = [],
  lessonId = id,
): TreeDefinition['nodes'][number] => ({ id, lessonId, title: id, prerequisites });

describe('validateTree', () => {
  it('returns no violations for a valid DAG fully covering the catalog', () => {
    const definition = def([node('a'), node('b', ['a']), node('c', ['a', 'b'])]);
    expect(validateTree(definition, ['a', 'b', 'c'])).toEqual([]);
  });

  it('flags a duplicate node id', () => {
    const definition = def([node('a'), node('a')]);
    const codes = validateTree(definition, ['a']).map((v) => v.code);
    expect(codes).toContain('duplicate_id');
  });

  it('flags a node referencing an unknown lesson', () => {
    const definition = def([node('a', [], 'ghost')]);
    const v = validateTree(definition, ['a']);
    expect(v).toEqual([
      expect.objectContaining({ code: 'unknown_lesson', ref: 'a' }),
    ]);
  });

  it('flags a dangling prerequisite ref', () => {
    const definition = def([node('a', ['missing'])]);
    const codes = validateTree(definition, ['a']).map((v) => v.code);
    expect(codes).toContain('dangling_prerequisite');
  });

  it('flags a node that lists itself as a prerequisite', () => {
    const definition = def([node('a', ['a'])]);
    const codes = validateTree(definition, ['a']).map((v) => v.code);
    expect(codes).toContain('self_prerequisite');
    expect(codes).not.toContain('dangling_prerequisite'); // self is not "dangling"
  });

  it('detects a two-node cycle and names every participant', () => {
    const definition = def([node('a', ['b']), node('b', ['a'])]);
    const violations = validateTree(definition, ['a', 'b']);
    expect(violations.map((v) => v.code)).toContain('cycle');
    // Both nodes are attributed, in definition order (deterministic).
    expect(violations.filter((v) => v.code === 'cycle').map((v) => v.ref)).toEqual(['a', 'b']);
  });

  it('detects a longer cycle and names every participant', () => {
    const definition = def([node('a', ['c']), node('b', ['a']), node('c', ['b'])]);
    const violations = validateTree(definition, ['a', 'b', 'c']);
    expect(violations.filter((v) => v.code === 'cycle').map((v) => v.ref)).toEqual(['a', 'b', 'c']);
  });

  it('attributes the cycle to its members only, not acyclic nodes pointing into it', () => {
    // a⇄b is the cycle; c depends on both a and b (cross edges into a finished
    // SCC) but is not itself part of any cycle.
    const definition = def([node('a', ['b']), node('b', ['a']), node('c', ['a', 'b'])]);
    const cyclicRefs = validateTree(definition, ['a', 'b', 'c'])
      .filter((v) => v.code === 'cycle')
      .map((v) => v.ref);
    expect(cyclicRefs).toEqual(['a', 'b']);
  });

  it('does not run reachability while a cycle is present (cycle takes precedence)', () => {
    const definition = def([node('a', ['b']), node('b', ['a'])]);
    const codes = validateTree(definition, ['a', 'b']).map((v) => v.code);
    expect(codes).not.toContain('unreachable');
  });

  it('flags an unreachable node whose backward chain ends at a dangling ref, not a root', () => {
    // An acyclic graph can only be unreachable when a backward prereq chain
    // terminates at a non-existent node instead of an entry point. Here y→z→y2,
    // and y2 does not exist: no cycle, but forward BFS from `root` never hits
    // y or z. Both `unreachable` and `dangling_prerequisite` are expected.
    const island = def([node('root'), node('x', ['root']), node('y', ['z']), node('z', ['y2'])]);
    const codes = validateTree(island, ['root', 'x', 'y', 'z']).map((v) => v.code);
    expect(codes).toContain('unreachable');
    expect(codes).toContain('dangling_prerequisite');
  });

  it('treats an entry-point-only tree as fully reachable', () => {
    const definition = def([node('a'), node('b')]);
    expect(validateTree(definition, ['a', 'b'])).toEqual([]);
  });
});

describe('findUncoveredLessons', () => {
  it('returns catalog lessons that have no tree node', () => {
    const definition = def([node('a'), node('b', ['a'])]);
    expect(findUncoveredLessons(definition, ['a', 'b', 'extra'])).toEqual(['extra']);
  });

  it('returns an empty array when every lesson is covered', () => {
    const definition = def([node('a')]);
    expect(findUncoveredLessons(definition, ['a'])).toEqual([]);
  });

  it('deduplicates repeated catalog slugs', () => {
    const definition = def([node('a')]);
    expect(findUncoveredLessons(definition, ['a', 'b', 'b'])).toEqual(['b']);
  });
});
