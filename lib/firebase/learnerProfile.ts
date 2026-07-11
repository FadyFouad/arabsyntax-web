import { getFirestoreDb } from './client';
import {
  buildLearnerProfileSkip,
  buildLearnerProfileSubmit,
  countFilledFields,
  shouldShowProfileForm,
  type LearnerProfileFormValues,
} from './contracts/learnerProfilePayload';

/**
 * `users/{uid}` I/O for the post-sign-in profile form (feature 008). Payload
 * shapes are decided by the pure builders in ./contracts/learnerProfilePayload.ts,
 * which is where the tests are. Exactly one write per submit and one per skip —
 * never a write on open (the open path only reads).
 */

/** One `getDoc` deciding whether the form should be offered to this user. */
export async function checkShouldShowProfileForm(uid: string): Promise<boolean> {
  const db = await getFirestoreDb();
  const { doc, getDoc } = await import('firebase/firestore');
  const snapshot = await getDoc(doc(db, 'users', uid));
  return shouldShowProfileForm(snapshot.exists() ? snapshot.data() : undefined);
}

/**
 * The submit's single merge write.
 *
 * @returns `fieldsFilled` — the answered-question count the analytics event reports.
 */
export async function submitLearnerProfile(
  uid: string,
  values: LearnerProfileFormValues,
): Promise<{ fieldsFilled: number }> {
  const db = await getFirestoreDb();
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

  const payload = buildLearnerProfileSubmit(values, serverTimestamp);
  await setDoc(doc(db, 'users', uid), payload, { merge: true });
  return { fieldsFilled: countFilledFields(payload) };
}

/** The skip's single merge write. */
export async function skipLearnerProfile(uid: string): Promise<void> {
  const db = await getFirestoreDb();
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid), buildLearnerProfileSkip(serverTimestamp), { merge: true });
}
