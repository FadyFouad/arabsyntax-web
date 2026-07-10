import { describe, it, expect } from 'vitest';
import {
  parseCompletedKeys,
  planUnionMerge,
  buildCompletionUpdate,
  buildCompletionCreate,
} from '@/lib/firebase/contracts/progressPlan';

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT: specs/006-web-account-sync/contracts/firestore-progress.md
//
// `users/{uid}/progress/lesson_completion` holds `completed`: a MAP of
// lessonId → completion time (Firestore Timestamp on newer writes, ISO-8601
// string on historical ones — both platforms' readers accept both). It is NOT a
// map of booleans.
//
// Two failure modes this file exists to prevent:
//
//   1. Whole-map replacement (C-3). The app's `writeAll` clobbers `completed`;
//      web must never emit anything but per-key dot-path merges. A regression
//      here silently deletes a user's completions on their phone.
//
//   2. Non-monotonic writes (FR-15). Web never writes `false`, never emits a
//      delete sentinel, never removes a key. Un-completing is a signed-out-only
//      local affordance.
//
// The dot-path key SHAPE is asserted here; that Firestore actually interprets
// it as a path (and not as a literal field name — the JS-SDK trap) is asserted
// by the emulator test in e2e/auth/progress.spec.ts.
// ─────────────────────────────────────────────────────────────────────────────

const SENTINEL = { __sentinel: 'serverTimestamp' } as const;
const stamp = () => SENTINEL;

/** Minimal stand-in for a Firestore Timestamp value. */
const ts = (ms: number) => ({ toMillis: () => ms });

describe('parseCompletedKeys — tolerates both historical value types', () => {
  it('reads Timestamp values (app steady-state writes)', () => {
    const keys = parseCompletedKeys({ completed: { elm_alnaho: ts(1), aqsam_kalam: ts(2) } });
    expect([...keys].sort()).toEqual(['aqsam_kalam', 'elm_alnaho']);
  });

  it('reads ISO-8601 string values (historical app merge writes)', () => {
    const keys = parseCompletedKeys({ completed: { elm_alnaho: '2026-01-01T00:00:00.000Z' } });
    expect([...keys]).toEqual(['elm_alnaho']);
  });

  it('reads a doc that mixes both value types', () => {
    const keys = parseCompletedKeys({
      completed: { elm_alnaho: ts(1), aqsam_kalam: '2026-01-01T00:00:00.000Z' },
    });
    expect(keys.size).toBe(2);
  });

  it('ignores keys whose value is null, undefined, or false', () => {
    const keys = parseCompletedKeys({
      completed: { done: ts(1), nulled: null, undef: undefined, falsey: false },
    });
    expect([...keys]).toEqual(['done']);
  });

  it.each([
    ['missing doc', undefined],
    ['empty doc', {}],
    ['null completed', { completed: null }],
    ['completed is an array', { completed: ['elm_alnaho'] }],
    ['completed is a string', { completed: 'elm_alnaho' }],
    ['doc is not an object', 'nope'],
  ])('yields an empty set for %s rather than throwing', (_label, data) => {
    expect(parseCompletedKeys(data).size).toBe(0);
  });
});

describe('planUnionMerge — union only, never a removal', () => {
  it('returns local ids the cloud is missing', () => {
    const plan = planUnionMerge(new Set(['a', 'b', 'c']), new Set(['b']));
    expect(plan).toEqual(['a', 'c']);
  });

  it('returns an empty plan when the cloud already has every local id', () => {
    expect(planUnionMerge(new Set(['a']), new Set(['a', 'b']))).toEqual([]);
  });

  it('never plans a write for a cloud id absent locally (no deletions)', () => {
    const plan = planUnionMerge(new Set(), new Set(['cloud_only']));
    expect(plan).toEqual([]);
  });

  it('is deterministic (sorted) so batched writes are reproducible', () => {
    expect(planUnionMerge(new Set(['c', 'a', 'b']), new Set())).toEqual(['a', 'b', 'c']);
  });
});

describe('buildCompletionUpdate — per-key dot paths, never a whole map', () => {
  it('emits exactly one dot-path key per id, plus updatedAt', () => {
    const update = buildCompletionUpdate(['elm_alnaho'], stamp);
    expect(update).toEqual({
      'completed.elm_alnaho': SENTINEL,
      updatedAt: SENTINEL,
    });
  });

  it('batches the sign-in union into a single update', () => {
    const update = buildCompletionUpdate(['a', 'b'], stamp)!;
    expect(Object.keys(update).sort()).toEqual(['completed.a', 'completed.b', 'updatedAt']);
  });

  it('never emits a bare `completed` key (whole-map replacement, C-3)', () => {
    const update = buildCompletionUpdate(['a'], stamp)!;
    expect(update).not.toHaveProperty('completed');
  });

  it('never emits false or a delete sentinel (monotonic, FR-15)', () => {
    const update = buildCompletionUpdate(['a', 'b'], stamp)!;
    for (const value of Object.values(update)) expect(value).toBe(SENTINEL);
  });

  it('returns null for an empty plan, so an empty diff cannot issue a write', () => {
    expect(buildCompletionUpdate([], stamp)).toBeNull();
  });
});

describe('buildCompletionCreate — first-ever write for a user', () => {
  it('nests the ids under `completed` so a merge write creates the map', () => {
    expect(buildCompletionCreate(['a', 'b'], stamp)).toEqual({
      completed: { a: SENTINEL, b: SENTINEL },
      updatedAt: SENTINEL,
    });
  });

  it('never emits a dot-path key (setDoc would take it literally)', () => {
    const create = buildCompletionCreate(['elm_alnaho'], stamp)!;
    expect(Object.keys(create)).not.toContain('completed.elm_alnaho');
  });

  it('returns null for an empty plan', () => {
    expect(buildCompletionCreate([], stamp)).toBeNull();
  });
});
