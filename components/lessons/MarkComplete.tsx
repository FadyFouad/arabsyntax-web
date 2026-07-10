'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Check, Circle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCompletedLessons, setLessonComplete } from './useLessonProgress';

// Pulled in only once a signed-out visitor actually completes a lesson, so the
// nudge (and the sign-in buttons it embeds) never weigh on the lesson page —
// least of all in a flag-off build, where it can never render at all.
const SaveProgressNudge = dynamic(() => import('@/components/auth/SaveProgressNudge'), {
  ssr: false,
});

/**
 * Completion toggle on the lesson detail page. The only progress signal the web
 * app has — clicking it marks the lesson done, which unlocks dependent nodes in
 * the tree. State is read from the shared local store, so the tree and this
 * button stay in sync across tabs.
 *
 * Signed in, it is also the cloud completion signal, and it stops being a toggle:
 * progress is monotonic across devices (FR-15), so un-completing here would have
 * to delete a key the phone still shows — exactly the write the cross-platform
 * contract forbids. Signed out, the local un-toggle is unchanged.
 *
 * With `featureFlags.webAccounts` off there is no AuthProvider above this, so
 * `useAuth()` yields the `disabled` default and this behaves exactly as before.
 */
export default function MarkComplete({ lessonId }: { lessonId: string }) {
  const t = useTranslations('lessons');
  const completed = useCompletedLessons();
  const { status, recordCompletion } = useAuth();
  const [showNudge, setShowNudge] = useState(false);

  const done = completed.has(lessonId);
  const signedIn = status === 'signedIn';
  const signedOutWithAccounts = status === 'signedOut';

  function complete() {
    setLessonComplete(lessonId, true);
    // One write per press (C-3). A failure leaves the completion in localStorage;
    // the next sign-in's union merge re-sends it.
    recordCompletion(lessonId);
  }

  function handleClick() {
    if (done) {
      // Only reachable while signed out — the signed-in branch renders a static
      // state, not a button.
      setLessonComplete(lessonId, false);
      setShowNudge(false);
      return;
    }
    complete();
    if (signedOutWithAccounts) setShowNudge(true);
  }

  if (signedIn && done) {
    return (
      <p className="inline-flex items-center gap-2 rounded-lg border border-success px-4 py-2 text-sm font-semibold text-success">
        <Check className="h-4 w-4" aria-hidden="true" />
        <span>{t('completedBadge')}</span>
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-pressed={done}
        onClick={handleClick}
        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
          done
            ? 'border-success text-success hover:border-text-muted hover:text-text-muted'
            : 'border-primary bg-primary text-primary-fg hover:bg-primary-hover'
        }`}
      >
        {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
        <span>{done ? t('completedBadge') : t('markComplete')}</span>
      </button>

      {showNudge && <SaveProgressNudge onDismiss={() => setShowNudge(false)} />}
    </>
  );
}
