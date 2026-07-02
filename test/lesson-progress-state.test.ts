import { describe, it, expect } from 'vitest';
import {
  parseCompleted,
  serializeCompleted,
  isUnlocked,
  deriveNodeState,
  withCompletion,
} from '@/lib/lessons/progress/state';

// The progress model is the deterministic core shared by the tree and the
// lesson pages. Completion is the only unlock signal (no quiz gate), so these
// cases pin the derive/unlock rules and the tolerant parse of a local key.

describe('parseCompleted', () => {
  it('returns an empty set for null / empty input', () => {
    expect(parseCompleted(null).size).toBe(0);
    expect(parseCompleted('').size).toBe(0);
  });

  it('parses a JSON array of lessonIds', () => {
    expect([...parseCompleted('["a","b"]')].sort()).toEqual(['a', 'b']);
  });

  it('drops non-string members', () => {
    expect([...parseCompleted('["a",1,null,"b"]')].sort()).toEqual(['a', 'b']);
  });

  it('returns an empty set for a non-array JSON value', () => {
    expect(parseCompleted('{"a":true}').size).toBe(0);
  });

  it('returns an empty set for malformed JSON instead of throwing', () => {
    expect(parseCompleted('{ not json').size).toBe(0);
  });
});

describe('serializeCompleted', () => {
  it('round-trips through parseCompleted', () => {
    const set = new Set(['c', 'a', 'b']);
    expect(parseCompleted(serializeCompleted(set))).toEqual(set);
  });

  it('emits a stable, sorted array', () => {
    expect(serializeCompleted(new Set(['b', 'a']))).toBe('["a","b"]');
  });
});

describe('isUnlocked', () => {
  it('is true when there are no prerequisites', () => {
    expect(isUnlocked([], new Set())).toBe(true);
  });

  it('is true only when every prerequisite is completed', () => {
    expect(isUnlocked(['a', 'b'], new Set(['a', 'b']))).toBe(true);
    expect(isUnlocked(['a', 'b'], new Set(['a']))).toBe(false);
  });
});

describe('deriveNodeState', () => {
  const node = { lessonId: 'x', prerequisites: ['a', 'b'] };

  it('is completed when the lesson itself is completed', () => {
    expect(deriveNodeState(node, new Set(['x']))).toBe('completed');
  });

  it('is available when all prerequisites are met but the lesson is not done', () => {
    expect(deriveNodeState(node, new Set(['a', 'b']))).toBe('available');
  });

  it('is locked when a prerequisite is missing', () => {
    expect(deriveNodeState(node, new Set(['a']))).toBe('locked');
  });

  it('treats an entry point (no prerequisites) as available', () => {
    expect(deriveNodeState({ lessonId: 'root', prerequisites: [] }, new Set())).toBe('available');
  });
});

describe('withCompletion', () => {
  it('adds a lessonId without mutating the input', () => {
    const before = new Set(['a']);
    const after = withCompletion(before, 'b', true);
    expect([...after].sort()).toEqual(['a', 'b']);
    expect(before.has('b')).toBe(false);
  });

  it('removes a lessonId', () => {
    expect([...withCompletion(new Set(['a', 'b']), 'b', false)]).toEqual(['a']);
  });
});
