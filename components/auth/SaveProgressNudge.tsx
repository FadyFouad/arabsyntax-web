'use client';

// 'use client' justification (constitution IV): shown in response to a client-side
// completion event, and owns its own dismissal state.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import SignInButtons from './SignInButtons';

/**
 * FR-17: after a signed-out visitor marks a lesson complete, offer to save that
 * progress to an account. Dismissible, never modal — the completion already
 * persisted locally, so this is an offer, not a gate.
 */
export default function SaveProgressNudge({ onDismiss }: { onDismiss?: () => void }) {
  const t = useTranslations('auth');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <aside
      aria-label={t('nudge.title')}
      className="mt-4 rounded-2xl border border-border bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-text">{t('nudge.title')}</h2>
          <p className="mt-1 text-sm text-text-body">{t('nudge.body')}</p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label={t('nudge.dismiss')}
          className="shrink-0 rounded-lg p-1 text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4">
        <SignInButtons onSuccess={dismiss} />
      </div>
    </aside>
  );
}
