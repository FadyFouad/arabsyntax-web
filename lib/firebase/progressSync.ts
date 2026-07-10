import type { DocumentReference, Firestore } from 'firebase/firestore';
import { getFirestoreDb } from './client';
import {
  buildCompletionCreate,
  buildCompletionUpdate,
  parseCompletedKeys,
  planUnionMerge,
} from './contracts/progressPlan';

/**
 * `users/{uid}/progress/lesson_completion` — the one progress document the web
 * touches. Its siblings (`quiz_results`, `streak_data`, `audio_positions`) are
 * never read and never written (FR-10).
 *
 * Contract: specs/006-web-account-sync/contracts/firestore-progress.md
 * Planning/payload shapes: ./contracts/progressPlan.ts (pure, unit-tested).
 */

const PROGRESS_DOC_ID = 'lesson_completion';

function progressRef(db: Firestore, uid: string): Promise<DocumentReference> {
  return import('firebase/firestore').then(({ doc }) =>
    doc(db, 'users', uid, 'progress', PROGRESS_DOC_ID),
  );
}

/** Cloud completions as a plain id set. Read failures surface to the caller. */
export async function readCloudCompletions(uid: string): Promise<Set<string>> {
  const db = await getFirestoreDb();
  const { getDoc } = await import('firebase/firestore');
  const snapshot = await getDoc(await progressRef(db, uid));
  return parseCompletedKeys(snapshot.data());
}

/**
 * Write the given lessonIds as completions, touching nothing else in the map.
 *
 * `updateDoc` is the only web API that interprets `completed.<id>` as a PATH.
 * It requires the document to exist, so a first-ever write falls back to a
 * nested-map `setDoc(..., {merge:true})` — key-wise merge, so it stays safe
 * against the app writing in the gap between the two calls.
 */
async function writeCompletions(uid: string, lessonIds: readonly string[]): Promise<void> {
  if (lessonIds.length === 0) return;

  const db = await getFirestoreDb();
  const { updateDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const ref = await progressRef(db, uid);

  const update = buildCompletionUpdate(lessonIds, serverTimestamp);
  if (!update) return;

  try {
    await updateDoc(ref, update);
  } catch (error) {
    if ((error as { code?: string }).code !== 'not-found') throw error;
    const create = buildCompletionCreate(lessonIds, serverTimestamp);
    if (create) await setDoc(ref, create, { merge: true });
  }
}

/** One write per Mark-Complete press (C-3). Never a debounce queue, never a batch of unrelated keys. */
export async function writeCompletion(uid: string, lessonId: string): Promise<void> {
  await writeCompletions(uid, [lessonId]);
}

/**
 * Push local-only completions up on sign-in (FR-16), as ONE batched write.
 *
 * Union semantics in both directions: ids the cloud has and the browser doesn't
 * are pulled down by the caller; ids the browser has and the cloud doesn't are
 * pushed up here. Nothing is ever removed from either side (FR-15).
 *
 * @returns the ids that were pushed (empty when the cloud was already ahead).
 */
export async function mergeLocalIntoCloud(
  uid: string,
  localCompletions: ReadonlySet<string>,
  cloudCompletions: ReadonlySet<string>,
): Promise<string[]> {
  const missing = planUnionMerge(localCompletions, cloudCompletions);
  await writeCompletions(uid, missing);
  return missing;
}
