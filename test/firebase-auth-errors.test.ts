import { describe, it, expect } from 'vitest';
import {
  mapAuthError,
  otherProvider,
  shouldFallBackToRedirect,
  providerFromSignInMethod,
} from '@/lib/firebase/contracts/authErrors';

// ─────────────────────────────────────────────────────────────────────────────
// FR-6 (cross-provider collision) and FR-1 (popup with redirect fallback).
//
// "One account per email address" is ENABLED on the project (D-6), so signing in
// with Google using an email already bound to Apple raises
// `auth/account-exists-with-different-credential`. The user must be told WHICH
// provider to use — a generic "try another method" is the failure this maps away.
//
// Enumeration protection can blank the email on that error, so the existing
// provider may be unknown. With exactly two providers, the other one is a sound
// answer either way (research.md R-7).
// ─────────────────────────────────────────────────────────────────────────────

describe('otherProvider', () => {
  it('pairs the two providers', () => {
    expect(otherProvider('google')).toBe('apple');
    expect(otherProvider('apple')).toBe('google');
  });
});

describe('providerFromSignInMethod', () => {
  it.each([
    ['google.com', 'google'],
    ['apple.com', 'apple'],
  ] as const)('maps the %s sign-in method', (method, expected) => {
    expect(providerFromSignInMethod(method)).toBe(expected);
  });

  it.each(['password', 'phone', 'anonymous', ''])('returns null for the unsupported method %s', (method) => {
    expect(providerFromSignInMethod(method)).toBeNull();
  });
});

describe('mapAuthError — cross-provider collision (FR-6)', () => {
  it('names the provider the account actually uses, when it is known', () => {
    const result = mapAuthError('auth/account-exists-with-different-credential', 'google', 'apple');
    expect(result).toEqual({ key: 'accountExists', provider: 'apple' });
  });

  it('falls back to naming the OTHER provider when the lookup is blanked', () => {
    // Enumeration protection hides customData.email → fetchSignInMethodsForEmail
    // returns nothing. Attempted Google, so Apple is the only other answer.
    expect(mapAuthError('auth/account-exists-with-different-credential', 'google', null)).toEqual({
      key: 'accountExists',
      provider: 'apple',
    });
    expect(mapAuthError('auth/account-exists-with-different-credential', 'apple', undefined)).toEqual({
      key: 'accountExists',
      provider: 'google',
    });
  });

  it('never tells the user to retry the provider they just tried', () => {
    for (const attempted of ['google', 'apple'] as const) {
      const result = mapAuthError('auth/account-exists-with-different-credential', attempted, attempted);
      expect(result?.provider).not.toBe(attempted);
    }
  });
});

describe('mapAuthError — user-cancelled attempts surface no error', () => {
  it.each([
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
    'auth/user-cancelled',
    'auth/web-storage-unsupported',
  ])('%s resolves to null (silent) rather than an error banner', (code) => {
    // Closing the popup is a decision, not a failure to report back at them.
    // (web-storage-unsupported is handled by the redirect fallback instead.)
    expect(mapAuthError(code, 'google')).toBeNull();
  });
});

describe('mapAuthError — recognised failures map to localized keys', () => {
  it.each([
    ['auth/network-request-failed', 'network'],
    ['auth/too-many-requests', 'tooManyRequests'],
    ['auth/operation-not-allowed', 'unsupported'],
    ['auth/unauthorized-domain', 'unsupported'],
    ['auth/user-disabled', 'userDisabled'],
  ])('%s → auth.errors.%s', (code, key) => {
    expect(mapAuthError(code, 'google')).toEqual({ key });
  });

  it.each(['auth/internal-error', 'auth/invalid-credential', 'boom', ''])(
    'falls back to the generic key for the unrecognised code %s',
    (code) => {
      expect(mapAuthError(code, 'apple')).toEqual({ key: 'generic' });
    },
  );
});

describe('shouldFallBackToRedirect (FR-1)', () => {
  it.each([
    'auth/popup-blocked',
    'auth/operation-not-supported-in-this-environment',
    'auth/web-storage-unsupported',
  ])('retries %s as a redirect', (code) => {
    expect(shouldFallBackToRedirect(code)).toBe(true);
  });

  it('does NOT retry a popup the user closed themselves', () => {
    // Re-opening as a full-page redirect after a deliberate dismissal would be
    // hostile — and would fire a second `login` analytics event for one intent.
    expect(shouldFallBackToRedirect('auth/popup-closed-by-user')).toBe(false);
    expect(shouldFallBackToRedirect('auth/cancelled-popup-request')).toBe(false);
  });

  it.each(['auth/network-request-failed', 'auth/account-exists-with-different-credential'])(
    'does not retry %s (a redirect would fail the same way)',
    (code) => {
      expect(shouldFallBackToRedirect(code)).toBe(false);
    },
  );
});
