/**
 * Pure planner for `users/{uid}/progress/lesson_completion`.
 *
 * Contract: specs/006-web-account-sync/contracts/firestore-progress.md
 *
 * `completed` is a map of lessonId → completion time, NOT of booleans. The app
 * reads it with a tolerant parser because two value types shipped historically:
 * Firestore `Timestamp` (current) and ISO-8601 strings (older merge writes).
 *
 * No `firebase/*` import here — the sentinel is injected, same as
 * ./profilePayload. That is what lets the C-3 (never replace the whole map) and
 * FR-15 (never un-complete) invariants be asserted by a unit test.
 */

/** Extract the completed lessonIds, ignoring value type. Never throws. */
export function parseCompletedKeys(data: unknown): Set<string> {
  const keys = new Set<string>();
  if (!data || typeof data !== 'object') return keys;

  const completed = (data as { completed?: unknown }).completed;
  // An array is `typeof 'object'` too, and its indices are not lessonIds.
  if (!completed || typeof completed !== 'object' || Array.isArray(completed)) return keys;

  for (const [lessonId, value] of Object.entries(completed as Record<string, unknown>)) {
    // A Timestamp or an ISO string both mean "done". Nothing else does — and a
    // literal `false` must not be read as a completion if one ever appears.
    if (value !== null && value !== undefined && value !== false) keys.add(lessonId);
  }
  return keys;
}

/**
 * Ids present locally but missing from the cloud. Deliberately asymmetric: a
 * cloud id absent locally is pulled DOWN into the local store, never deleted
 * from the cloud (FR-15/FR-16 — the merge is a union, in both directions).
 */
export function planUnionMerge(
  local: ReadonlySet<string>,
  cloud: ReadonlySet<string>,
): string[] {
  return [...local].filter((id) => !cloud.has(id)).sort();
}

/**
 * Dot-path merge for a document that already exists. `updateDoc` interprets
 * `completed.<id>` as a path into the map, touching only that one entry.
 *
 * Returns null for an empty plan so an empty diff can't produce a write at all.
 */
export function buildCompletionUpdate<T>(
  lessonIds: readonly string[],
  serverTimestamp: () => T,
): Record<string, unknown> | null {
  if (lessonIds.length === 0) return null;

  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const lessonId of lessonIds) {
    update[`completed.${lessonId}`] = serverTimestamp();
  }
  return update;
}

/**
 * Nested-map create for a user with no cloud progress document yet.
 *
 * This shape — NOT the dot-path one — is what `setDoc(..., {merge:true})` needs:
 * the JS SDK treats a dot in a setDoc key as part of a literal field name, so
 * the dot-path version would write a top-level field called
 * `"completed.elm_alnaho"` that the app would never look at. Merging a nested
 * map is key-wise, so this stays clobber-safe if the app writes concurrently.
 */
export function buildCompletionCreate<T>(
  lessonIds: readonly string[],
  serverTimestamp: () => T,
): Record<string, unknown> | null {
  if (lessonIds.length === 0) return null;

  const completed: Record<string, unknown> = {};
  for (const lessonId of lessonIds) {
    completed[lessonId] = serverTimestamp();
  }
  return { completed, updatedAt: serverTimestamp() };
}
