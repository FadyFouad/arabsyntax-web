'use client';

// 'use client' justification (constitution IV): this island owns browser-only
// state — localStorage markers, Firebase's IndexedDB session, and an
// onAuthStateChanged subscription. None of it can be resolved on the server, and
// the site must stay pure SSG (no dynamic rendering, no session cookies).
//
// It renders `children` immediately and unconditionally. Signed-out visitors are
// never gated behind a loading state, and the first client render is identical
// to the server render, so the prerendered HTML is unchanged (SC-7).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { featureFlags } from '@/lib/featureFlags';
import {
  applyCloudCompletions,
  readCompletedLessons,
} from '@/components/lessons/useLessonProgress';
import type { AuthProviderId, SignInOutcome } from '@/lib/firebase/auth';

/**
 * `loading` is the pre-mount state, so the server and the first client render
 * agree. Consumers render nothing until it resolves.
 */
export type AuthStatus = 'disabled' | 'loading' | 'signedOut' | 'signedIn';
export type SyncState = 'idle' | 'merging' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  isPremium: boolean;
  syncState: SyncState;
  signIn: (provider: AuthProviderId) => Promise<SignInOutcome>;
  signOut: () => Promise<void>;
  /** Mirror a local completion into the cloud. No-op while signed out. */
  recordCompletion: (lessonId: string) => void;
}

/**
 * The default value is what every consumer sees when the flag is off and no
 * provider is mounted — so `MarkComplete` and friends need no flag check of
 * their own, and behave exactly as they did before this feature.
 */
const DEFAULT: AuthContextValue = {
  status: 'disabled',
  user: null,
  isPremium: false,
  syncState: 'idle',
  signIn: async () => ({ status: 'cancelled' }),
  signOut: async () => {},
  recordCompletion: () => {},
};

const AuthContext = createContext<AuthContextValue>(DEFAULT);

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // `webAccounts` is a build-time constant, so the flag-off state is known at
  // first render — derive it in the initializer rather than correcting it with a
  // setState inside the effect (which would trigger a cascading render).
  const [status, setStatus] = useState<AuthStatus>(() =>
    featureFlags.webAccounts ? 'loading' : 'disabled',
  );
  const [user, setUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');

  /** onAuthStateChanged is attached at most once per page load. */
  const listenerAttached = useRef(false);
  const unsubscribe = useRef<(() => void) | null>(null);
  /** The uid whose sign-in pipeline (progress merge + entitlement) already ran. */
  const syncedUid = useRef<string | null>(null);

  /**
   * FR-7 + FR-16, once per signed-in uid: pull cloud completions down into the
   * local store, then push local-only ones up. Both directions are unions —
   * nothing is deleted on either side.
   *
   * A failure here is non-blocking: the completions stay in localStorage and the
   * next sign-in's merge retries them (writes are idempotent).
   */
  const runSignInSync = useCallback(async (uid: string) => {
    setSyncState('merging');
    try {
      const { readCloudCompletions, mergeLocalIntoCloud } = await import('@/lib/firebase/progressSync');

      const cloud = await readCloudCompletions(uid);
      applyCloudCompletions(cloud);
      await mergeLocalIntoCloud(uid, readCompletedLessons(), cloud);

      setSyncState('idle');
    } catch {
      setSyncState('error');
    }
  }, []);

  /** Resolved once per session and cached — no realtime listener (D-4). */
  const resolveEntitlement = useCallback(async (uid: string) => {
    const { fetchIsPremium } = await import('@/lib/firebase/entitlement');
    setIsPremium(await fetchIsPremium(uid));
  }, []);

  const onUserResolved = useCallback(
    (nextUser: User | null) => {
      setUser(nextUser);

      if (!nextUser) {
        setStatus('signedOut');
        setIsPremium(false);
        syncedUid.current = null;
        return;
      }

      setStatus('signedIn');
      if (syncedUid.current === nextUser.uid) return;
      syncedUid.current = nextUser.uid;

      void runSignInSync(nextUser.uid);
      void resolveEntitlement(nextUser.uid);
    },
    [runSignInSync, resolveEntitlement],
  );

  /**
   * Loads Firebase. Calling this is what breaks the zero-traffic invariant, so
   * it happens only when a returning user is detected or a sign-in is attempted.
   */
  const attachAuthListener = useCallback(async () => {
    if (listenerAttached.current) return;
    listenerAttached.current = true;

    const { getFirebaseAuth } = await import('@/lib/firebase/client');
    const auth = await getFirebaseAuth();
    const { onAuthStateChanged } = await import('firebase/auth');
    unsubscribe.current = onAuthStateChanged(auth, onUserResolved);
  }, [onUserResolved]);

  useEffect(() => {
    // Status is already 'disabled' from the initializer when the flag is off; the
    // provider isn't even mounted in that case, so this is just belt-and-braces.
    if (!featureFlags.webAccounts) return;

    let cancelled = false;

    void (async () => {
      const { hasAuthMarker, hasPendingRedirect, completeRedirectSignIn } = await import(
        '@/lib/firebase/auth'
      );

      // The whole point of the marker: a visitor who has never signed in leaves
      // here without loading a byte of Firebase (FR-4/SC-7).
      const pendingRedirect = hasPendingRedirect();
      if (!hasAuthMarker() && !pendingRedirect) {
        if (!cancelled) setStatus('signedOut');
        return;
      }

      // The popup fallback (research.md R-2) lands back here. Resolving the
      // redirect runs the same post-sign-in pipeline the popup path runs.
      if (pendingRedirect) await completeRedirectSignIn();
      if (!cancelled) await attachAuthListener();
    })();

    return () => {
      cancelled = true;
      unsubscribe.current?.();
      unsubscribe.current = null;
    };
  }, [attachAuthListener]);

  const signIn = useCallback(
    async (provider: AuthProviderId): Promise<SignInOutcome> => {
      const { signInWith } = await import('@/lib/firebase/auth');
      const outcome = await signInWith(provider);

      // The popup path resolves before onAuthStateChanged can exist for a
      // first-time visitor — attach now so the session drives the UI from here on.
      if (outcome.status === 'success') await attachAuthListener();
      return outcome;
    },
    [attachAuthListener],
  );

  const signOut = useCallback(async () => {
    if (!user) return;
    const { signOutUser } = await import('@/lib/firebase/auth');
    await signOutUser(user.uid);
  }, [user]);

  const recordCompletion = useCallback(
    (lessonId: string) => {
      if (!user) return;
      void (async () => {
        try {
          const { writeCompletion } = await import('@/lib/firebase/progressSync');
          await writeCompletion(user.uid, lessonId);
        } catch {
          // Stays in localStorage; the next sign-in's union merge re-sends it.
        }
      })();
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ status, user, isPremium, syncState, signIn, signOut, recordCompletion }}
    >
      {children}
    </AuthContext.Provider>
  );
}
