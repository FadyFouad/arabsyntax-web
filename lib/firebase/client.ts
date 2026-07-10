import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { featureFlags } from '@/lib/featureFlags';
import { emulators, firebaseConfig, isConfigured } from './config';

/**
 * Lazy, memoized Firebase bootstrap. Every `firebase/*` entry point in this
 * repo is reached through an `await import()` inside a function body — never a
 * top-level import — so the SDK lands in async chunks and never enters the
 * module graph of a page.
 *
 * That is what makes FR-4/SC-7 structural rather than a promise: a signed-out
 * visitor who never opens a sign-in entry point downloads no Firebase code and
 * issues no Firebase request. `import type` above is erased at compile time and
 * costs nothing.
 *
 * Only `AuthProvider` (on seeing the `arabsyntax-auth` marker) and an explicit
 * sign-in attempt call into here.
 */

let appPromise: Promise<FirebaseApp> | null = null;
let authPromise: Promise<Auth> | null = null;
let firestorePromise: Promise<Firestore> | null = null;

/**
 * Loading Firebase with the flag off is a programming error, not a runtime
 * condition — every call site is already behind `featureFlags.webAccounts`, so
 * reaching here means a guard was dropped. Fail loudly rather than quietly
 * initializing an SDK that must be unreachable in production.
 */
function assertEnabled(): void {
  if (!featureFlags.webAccounts) {
    throw new Error('[firebase] webAccounts flag is off — Firebase must not be loaded');
  }
  if (!isConfigured()) {
    throw new Error('[firebase] NEXT_PUBLIC_FIREBASE_* config is incomplete');
  }
}

export function getFirebaseApp(): Promise<FirebaseApp> {
  assertEnabled();
  appPromise ??= (async () => {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  })();
  return appPromise;
}

export function getFirebaseAuth(): Promise<Auth> {
  assertEnabled();
  authPromise ??= (async () => {
    const app = await getFirebaseApp();
    const { getAuth, connectAuthEmulator } = await import('firebase/auth');
    const auth = getAuth(app);
    if (emulators.enabled) {
      connectAuthEmulator(auth, emulators.authUrl, { disableWarnings: true });
    }
    return auth;
  })();
  return authPromise;
}

export function getFirestoreDb(): Promise<Firestore> {
  assertEnabled();
  firestorePromise ??= (async () => {
    const app = await getFirebaseApp();
    const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');
    const db = getFirestore(app);
    if (emulators.enabled) {
      connectFirestoreEmulator(db, emulators.firestoreHost, emulators.firestorePort);
    }
    return db;
  })();
  return firestorePromise;
}
