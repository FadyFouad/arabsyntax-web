/**
 * Pure mapping from Firebase Auth error codes to localized message keys under
 * `auth.errors.*`, plus the popup→redirect fallback decision.
 *
 * Behavior: research.md R-2 (fallback) and R-7 (FR-6 cross-provider guidance).
 */

import type { AuthProviderId } from './profilePayload';

export type { AuthProviderId };

/** The project offers exactly two providers, so "the other one" is well defined. */
export function otherProvider(provider: AuthProviderId): AuthProviderId {
  return provider === 'google' ? 'apple' : 'google';
}

/** Firebase sign-in method ids (`fetchSignInMethodsForEmail`) → our provider ids. */
export function providerFromSignInMethod(method: string): AuthProviderId | null {
  if (method === 'google.com') return 'google';
  if (method === 'apple.com') return 'apple';
  return null;
}

export interface AuthErrorMessage {
  /** Key under `auth.errors` in messages/{ar,en}.json. */
  key: string;
  /** Interpolated into the message as `{provider}` when present. */
  provider?: AuthProviderId;
}

/**
 * Codes where the user themselves ended the attempt. Surfacing a red banner for
 * "you closed the window" is noise, so these resolve to null (render nothing).
 * They still count as `result: 'failure'` for analytics — that is the caller's
 * concern, not this mapper's.
 */
const SILENT_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
  // Handled by the redirect fallback; if the redirect also fails, that error
  // surfaces on its own terms.
  'auth/web-storage-unsupported',
]);

const CODE_TO_KEY: Record<string, string> = {
  'auth/network-request-failed': 'network',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/operation-not-allowed': 'unsupported',
  'auth/unauthorized-domain': 'unsupported',
  'auth/user-disabled': 'userDisabled',
};

/**
 * @param code       Firebase `AuthError.code`.
 * @param attempted  The provider the user just clicked.
 * @param existing   Provider the email is actually registered with, when the
 *                   lookup succeeded. Enumeration protection can blank it.
 * @returns null when nothing should be shown to the user.
 */
export function mapAuthError(
  code: string,
  attempted: AuthProviderId,
  existing?: AuthProviderId | null,
): AuthErrorMessage | null {
  if (SILENT_CODES.has(code)) return null;

  if (code === 'auth/account-exists-with-different-credential') {
    // Never tell them to retry the provider that just failed. If the lookup was
    // blanked (or nonsensically echoed the attempted provider), the other
    // provider is the only remaining answer — and with two providers, correct.
    const provider = existing && existing !== attempted ? existing : otherProvider(attempted);
    return { key: 'accountExists', provider };
  }

  return { key: CODE_TO_KEY[code] ?? 'generic' };
}

/**
 * Popup is the primary flow (it keeps the static page alive). These codes mean
 * the popup could not open or cannot work in this environment — a full-page
 * redirect is the documented remedy.
 *
 * A popup the user deliberately dismissed is NOT retried: reopening as a
 * redirect would navigate them away from the page they chose to stay on.
 */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

export function shouldFallBackToRedirect(code: string): boolean {
  return REDIRECT_FALLBACK_CODES.has(code);
}
