import type { Analytics } from 'firebase/analytics';
import { getFirebaseApp } from './client';
import { firebaseConfig } from './config';
import type { AuthProviderId } from './contracts/profilePayload';

/**
 * Firebase Analytics (GA4) — `login` / `sign_up` events plus `setUserId`.
 *
 * Contract: specs/006-web-account-sync/contracts/analytics-events.md
 *
 * PRIVACY POSTURE (constitution VI mitigation): GA4 sets cookies and storage, so
 * this module is initialized ONLY once a sign-in attempt has started — never on
 * page load. Anonymous browsing stays entirely cookie-free, which is why the
 * site still needs no consent banner. Do not call `initAnalytics()` from a
 * mount effect.
 *
 * Every export swallows its own failures: analytics is never allowed to affect
 * the outcome of a sign-in.
 */

type AnalyticsResult = 'success' | 'failure';

let analyticsPromise: Promise<Analytics | null> | null = null;

async function loadAnalytics(): Promise<Analytics | null> {
  // No Web App registered in the Firebase project yet → no measurementId → GA4
  // has nowhere to send events. Degrade to a no-op rather than throwing.
  if (!firebaseConfig.measurementId) return null;

  const { isSupported, getAnalytics } = await import('firebase/analytics');
  if (!(await isSupported())) return null;

  return getAnalytics(await getFirebaseApp());
}

/**
 * Begin loading GA4. Called at the START of a sign-in attempt, so the SDK is
 * warm by the time there is an event to log. Safe to call repeatedly.
 */
export function initAnalytics(): void {
  analyticsPromise ??= loadAnalytics().catch(() => null);
}

async function withAnalytics(fn: (analytics: Analytics) => void | Promise<void>): Promise<void> {
  try {
    initAnalytics();
    const analytics = await analyticsPromise;
    // Awaited, so a rejection inside `fn` lands in this catch rather than
    // escaping as an unhandled rejection.
    if (analytics) await fn(analytics);
  } catch {
    // Blocked by an extension, unsupported environment, offline — all no-ops.
  }
}

/** Fired once per sign-in attempt resolution, per provider attempt. */
export async function logLogin(method: AuthProviderId, result: AnalyticsResult): Promise<void> {
  await withAnalytics(async (analytics) => {
    const { logEvent } = await import('firebase/analytics');
    logEvent(analytics, 'login', { method, result });
  });
}

/** Fired only when the profile upsert set `createdAt` — a first-ever sign-in. */
export async function logSignUp(method: AuthProviderId): Promise<void> {
  await withAnalytics(async (analytics) => {
    const { logEvent } = await import('firebase/analytics');
    logEvent(analytics, 'sign_up', { method });
  });
}

export async function setAnalyticsUserId(uid: string): Promise<void> {
  await withAnalytics(async (analytics) => {
    const { setUserId } = await import('firebase/analytics');
    setUserId(analytics, uid);
  });
}
