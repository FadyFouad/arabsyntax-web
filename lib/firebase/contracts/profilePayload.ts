/**
 * Pure payload builder for `users/{uid}` — the profile document the mobile app
 * owns and this site merges into.
 *
 * Contract: specs/006-web-account-sync/contracts/firestore-user-doc.md
 *
 * The timestamp sentinel is INJECTED rather than imported so this module stays
 * free of any `firebase/*` import: it keeps the contract unit-testable without a
 * network, and it keeps the SDK out of every module graph that reaches here.
 * Callers pass Firestore's `serverTimestamp`.
 */

export type AuthProviderId = 'google' | 'apple';

export interface ProfileUpsertInput {
  email: string | null;
  displayName: string | null;
  provider: AuthProviderId;
  /** From a `getDoc` performed immediately before the write. */
  docExists: boolean;
  /** Whether that snapshot already carries a `createdAt` field. */
  hasCreatedAt: boolean;
}

/**
 * Server-owned keys. The Firestore rules reject any client write whose affected
 * key set includes one of these — which would fail the entire sign-in upsert,
 * not just the offending field.
 */
export const FORBIDDEN_PROFILE_KEYS = ['reengagementPushCount', 'lastReengagementPushAt'] as const;

export function buildProfileUpsert<T>(
  input: ProfileUpsertInput,
  serverTimestamp: () => T,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    provider: input.provider,
    lastSignInAt: serverTimestamp(),
  };

  // Null omission (C-1). Every write is a merge, so an explicit null would
  // ERASE the field. Apple hands back displayName only on first consent, so on
  // every later sign-in the name must simply be absent from the payload rather
  // than sent as null — otherwise the second Apple sign-in wipes the name the
  // first one stored.
  if (input.email) payload.email = input.email;
  if (input.displayName) payload.displayName = input.displayName;

  // Read-before-write: `createdAt` is written exactly once in a document's life.
  if (!input.docExists || !input.hasCreatedAt) {
    payload.createdAt = serverTimestamp();
  }

  return payload;
}

/** Sign-out marker; mirrors the app so `lastSignOutAt` means the same on both. */
export function buildSignOutPayload<T>(serverTimestamp: () => T): Record<string, unknown> {
  return { lastSignOutAt: serverTimestamp() };
}

/** True when the upsert payload created the document's `createdAt` — i.e. a first-ever sign-in. */
export function isFirstSignIn(payload: Record<string, unknown>): boolean {
  return 'createdAt' in payload;
}
