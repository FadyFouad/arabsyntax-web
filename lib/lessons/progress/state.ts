import type { NodeState } from '../tree/types';

/**
 * Pure progress model for the lesson tree (US2/US3/US5). Completion is the only
 * signal the web app has (no quiz gate), stored locally as a set of completed
 * lessonIds. These functions are the deterministic core the client store and
 * the tree/lesson UI share; the localStorage + React glue lives in
 * `components/lessons/useLessonProgress.ts` (mirrors how theme.ts stays pure
 * while ThemeToggle owns the window access).
 *
 * v1 invariant: a tree node's `id` equals its `lessonId`, and prerequisites are
 * expressed as node ids — so a prerequisite id IS a completion key. If a future
 * schema breaks that equality, unlock resolution must map prereq id → lessonId.
 */

export const PROGRESS_STORAGE_KEY = 'arabsyntax-lesson-progress';

/**
 * Parse the stored value into a set of completed lessonIds. Tolerant by design:
 * anything that isn't a JSON array of strings yields an empty set rather than
 * throwing, so a corrupted key never breaks rendering.
 */
export function parseCompleted(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return new Set();
    return new Set(value.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

/** Serialize a completion set to its stored form (a sorted JSON array). */
export function serializeCompleted(completed: ReadonlySet<string>): string {
  return JSON.stringify([...completed].sort());
}

/** A node is unlocked once every prerequisite has been completed. */
export function isUnlocked(prerequisites: readonly string[], completed: ReadonlySet<string>): boolean {
  return prerequisites.every((prereq) => completed.has(prereq));
}

/** Derive a node's display state from the current completion set. */
export function deriveNodeState(
  node: { lessonId: string; prerequisites: readonly string[] },
  completed: ReadonlySet<string>,
): NodeState {
  if (completed.has(node.lessonId)) return 'completed';
  return isUnlocked(node.prerequisites, completed) ? 'available' : 'locked';
}

/**
 * Return a new completion set with `lessonId` added or removed. Immutable so
 * callers can compare references / serialize without mutating shared state.
 */
export function withCompletion(
  completed: ReadonlySet<string>,
  lessonId: string,
  done: boolean,
): Set<string> {
  const next = new Set(completed);
  if (done) next.add(lessonId);
  else next.delete(lessonId);
  return next;
}
