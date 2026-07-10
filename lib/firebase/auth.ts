import type { Auth, User, UserCredential } from 'firebase/auth';
import { getFirebaseAuth } from './client';
import { initAnalytics, logLogin, logSignUp, setAnalyticsUserId } from './analytics';
import { upsertUserProfile, markSignOut } from './userProfile';
import {
  mapAuthError,
  providerFromSignInMethod,
  shouldFallBackToRedirect,
  type AuthErrorMessage,
  type AuthProviderId,
} from './contracts/authErrors';

/**
 * Sign-in / sign-out. Popup is primary; a redirect is used only where a popup
 * cannot work (research.md R-2).
 *
 * The marker below is the ONLY thing a page load reads to decide whether to
 * bootstrap Firebase at all. A visitor who has never signed in has no marker,
 * so no Firebase code is fetched and no request is made (FR-4/SC-7). It is not
 * authoritative — the real session lives in Firebase's own IndexedDB persistence.
 */

/** Presence (not value) is what matters. Set on sign-in, cleared on sign-out. */
export const AUTH_MARKER_KEY = 'arabsyntax-auth';

/** Set immediately before a redirect so the return trip knows to resolve it. */
export const REDIRECT_PENDING_KEY = 'arabsyntax-auth-redirect';

export type SignInOutcome =
  | { status: 'success'; user: User }
  | { status: 'redirecting' }
  /** The user closed the popup. Nothing to show them. */
  | { status: 'cancelled' }
  | { status: 'error'; message: AuthErrorMessage };

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private-mode / blocked storage: the session still works for this page
    // load; the next one just won't restore it.
  }
}

export function hasAuthMarker(): boolean {
  return readStorage(AUTH_MARKER_KEY) !== null;
}

export function hasPendingRedirect(): boolean {
  return readStorage(REDIRECT_PENDING_KEY) !== null;
}

function errorCode(error: unknown): string {
  return (error as { code?: string })?.code ?? '';
}

async function buildProvider(providerId: AuthProviderId) {
  const { GoogleAuthProvider, OAuthProvider } = await import('firebase/auth');
  if (providerId === 'google') return new GoogleAuthProvider();

  const apple = new OAuthProvider('apple.com');
  // Apple returns the name ONLY on the very first consent; without these scopes
  // it never returns it at all, and the profile would have no displayName ever.
  apple.addScope('email');
  apple.addScope('name');
  return apple;
}

/**
 * Everything that must happen after Firebase hands back a credential, shared by
 * the popup and redirect paths so they cannot drift.
 *
 * A failed profile upsert leaves the user signed in (contract, obligation 7):
 * the next auth-state resolution retries it. It must not roll back the session.
 */
async function completeSignIn(user: User, provider: AuthProviderId): Promise<void> {
  writeStorage(AUTH_MARKER_KEY, '1');

  let created = false;
  try {
    ({ created } = await upsertUserProfile(user, provider));
  } catch {
    // Retried on the next sign-in; never blocks the user from being signed in.
  }

  await setAnalyticsUserId(user.uid);
  await logLogin(provider, 'success');
  if (created) await logSignUp(provider);
}

/**
 * Resolve which provider an already-registered email belongs to, for the FR-6
 * message. Enumeration protection routinely blanks this — the caller has a
 * sound fallback (the other provider), so failure here is expected, not fatal.
 */
async function resolveExistingProvider(auth: Auth, error: unknown): Promise<AuthProviderId | null> {
  try {
    const email = (error as { customData?: { email?: string } })?.customData?.email;
    if (!email) return null;

    const { fetchSignInMethodsForEmail } = await import('firebase/auth');
    const methods = await fetchSignInMethodsForEmail(auth, email);
    for (const method of methods) {
      const provider = providerFromSignInMethod(method);
      if (provider) return provider;
    }
  } catch {
    // Fall through to the caller's "other provider" fallback.
  }
  return null;
}

export async function signInWith(providerId: AuthProviderId): Promise<SignInOutcome> {
  // A sign-in attempt is the consent boundary for analytics (see ./analytics.ts).
  initAnalytics();

  const auth = await getFirebaseAuth();
  const provider = await buildProvider(providerId);
  const { signInWithPopup, signInWithRedirect } = await import('firebase/auth');

  let credential: UserCredential;
  try {
    credential = await signInWithPopup(auth, provider);
  } catch (error) {
    const code = errorCode(error);

    if (shouldFallBackToRedirect(code)) {
      // No `login` event here: one user intent must produce exactly one event,
      // and it is logged when the redirect resolves (contracts/analytics-events.md).
      writeStorage(REDIRECT_PENDING_KEY, providerId);
      await signInWithRedirect(auth, provider);
      return { status: 'redirecting' };
    }

    await logLogin(providerId, 'failure');

    const message = mapAuthError(code, providerId, await resolveExistingProvider(auth, error));
    return message ? { status: 'error', message } : { status: 'cancelled' };
  }

  await completeSignIn(credential.user, providerId);
  return { status: 'success', user: credential.user };
}

/**
 * Resolve a redirect started by the popup fallback. Called on bootstrap only
 * when {@link hasPendingRedirect} is true — `getRedirectResult` is otherwise a
 * pointless round-trip.
 *
 * @returns null when the redirect produced no credential (e.g. the user backed out).
 */
export async function completeRedirectSignIn(): Promise<SignInOutcome | null> {
  const providerId = readStorage(REDIRECT_PENDING_KEY) as AuthProviderId | null;
  writeStorage(REDIRECT_PENDING_KEY, null);
  if (!providerId) return null;

  const auth = await getFirebaseAuth();
  const { getRedirectResult } = await import('firebase/auth');

  try {
    const credential = await getRedirectResult(auth);
    if (!credential) return null;

    await completeSignIn(credential.user, providerId);
    return { status: 'success', user: credential.user };
  } catch (error) {
    await logLogin(providerId, 'failure');
    const message = mapAuthError(
      errorCode(error),
      providerId,
      await resolveExistingProvider(auth, error),
    );
    return message ? { status: 'error', message } : { status: 'cancelled' };
  }
}

export async function signOutUser(uid: string): Promise<void> {
  const auth = await getFirebaseAuth();
  const { signOut } = await import('firebase/auth');

  try {
    await markSignOut(uid);
  } catch {
    // Parity nicety, not a precondition for signing out.
  }

  await signOut(auth);
  writeStorage(AUTH_MARKER_KEY, null);
  writeStorage(REDIRECT_PENDING_KEY, null);
}

export type { AuthErrorMessage, AuthProviderId };
