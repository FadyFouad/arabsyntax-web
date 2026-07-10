import type { User } from 'firebase/auth';
import { getFirestoreDb } from './client';
import {
  buildProfileUpsert,
  buildSignOutPayload,
  isFirstSignIn,
  type AuthProviderId,
} from './contracts/profilePayload';

/**
 * `users/{uid}` writes. Contract + rationale live in
 * specs/006-web-account-sync/contracts/firestore-user-doc.md; the payload shape
 * itself is decided by the pure builder in ./contracts/profilePayload.ts, which
 * is where the tests are.
 */

export { buildProfileUpsert, buildSignOutPayload } from './contracts/profilePayload';

/**
 * Merge the signed-in user into their shared profile document.
 *
 * @returns `created: true` when this write set `createdAt` — i.e. the user's
 * first-ever sign-in on any platform, which is the `sign_up` analytics trigger.
 */
export async function upsertUserProfile(
  user: Pick<User, 'uid' | 'email' | 'displayName'>,
  provider: AuthProviderId,
): Promise<{ created: boolean }> {
  const db = await getFirestoreDb();
  const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');

  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);

  // Key PRESENCE, not truthiness — matching the app's `containsKey('createdAt')`.
  // A doc whose createdAt is somehow null gets one written; a doc that has one
  // never gets it overwritten.
  const hasCreatedAt = snapshot.exists() && 'createdAt' in (snapshot.data() ?? {});

  const payload = buildProfileUpsert(
    {
      email: user.email,
      displayName: user.displayName,
      provider,
      docExists: snapshot.exists(),
      hasCreatedAt,
    },
    serverTimestamp,
  );

  await setDoc(ref, payload, { merge: true });
  return { created: isFirstSignIn(payload) };
}

/** Mirrors the app's sign-out marker so `lastSignOutAt` means the same on both platforms. */
export async function markSignOut(uid: string): Promise<void> {
  const db = await getFirestoreDb();
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid), buildSignOutPayload(serverTimestamp), { merge: true });
}

export type { AuthProviderId };
