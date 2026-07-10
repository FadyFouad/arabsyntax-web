/**
 * Firebase web config, read from NEXT_PUBLIC_* env at build time.
 *
 * These values are public by design — they name the project, they don't
 * authorize access to it. Authorization lives in the Firestore rules owned by
 * the mobile-app repo (feature 006 changes none of them, C-5).
 *
 * `process.env.NEXT_PUBLIC_*` must be referenced as full static member
 * expressions for Next to inline them into the client bundle; destructuring
 * `process.env` or indexing it dynamically yields `undefined` in the browser.
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  // Optional for this feature (auth + Firestore don't need them), but included
  // so the object matches the console's copy-paste config verbatim. storageBucket
  // is only consulted by Firebase Storage, messagingSenderId only by FCM —
  // neither is used here, so they stay optional and out of isConfigured().
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
}

export const firebaseConfig: FirebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

/** Emulator Suite ports — mirrored by firebase.json and next.config.ts's CSP. */
export const emulators = {
  enabled: process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === 'true',
  authUrl: 'http://127.0.0.1:9099',
  firestoreHost: '127.0.0.1',
  firestorePort: 8080,
} as const;

/**
 * Every field the SDK needs is present. A misconfigured build must fail loudly
 * at the sign-in call site rather than half-initialize Firebase, so callers
 * check this before bootstrapping.
 *
 * `measurementId` is deliberately not required — analytics degrades to a no-op
 * (contracts/analytics-events.md) while auth and Firestore still work.
 */
export function isConfigured(config: FirebaseWebConfig = firebaseConfig): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}
