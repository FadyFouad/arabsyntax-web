'use client';

// 'use client' justification (constitution IV): triggers the browser-only
// sign-in flow (popup window, redirect, localStorage marker) and owns the
// transient loading/error state around it.

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthProvider';
import type { AuthErrorMessage, AuthProviderId } from '@/lib/firebase/contracts/authErrors';

const PROVIDERS: ReadonlyArray<{ id: AuthProviderId; logo: string; labelKey: string }> = [
  { id: 'google', logo: '/logos/google.svg', labelKey: 'continueWithGoogle' },
  { id: 'apple', logo: '/logos/apple.svg', labelKey: 'continueWithApple' },
];

/**
 * Google + Apple sign-in buttons with a localized error surface.
 *
 * The FR-6 case is the one that matters: when an email is already bound to the
 * other provider, the message must NAME the provider to try instead — a generic
 * "sign-in failed" strands the user on an account they can't reach. The mapping
 * lives in lib/firebase/contracts/authErrors.ts.
 */
export default function SignInButtons({ onSuccess }: { onSuccess?: () => void }) {
  const t = useTranslations('auth');
  const { signIn } = useAuth();
  const [pending, setPending] = useState<AuthProviderId | null>(null);
  const [error, setError] = useState<AuthErrorMessage | null>(null);

  async function handleSignIn(provider: AuthProviderId) {
    setPending(provider);
    setError(null);

    const outcome = await signIn(provider);

    // 'redirecting' leaves the page entirely — keep the spinner up rather than
    // flashing an idle button during the navigation.
    if (outcome.status === 'redirecting') return;

    setPending(null);
    if (outcome.status === 'error') setError(outcome.message);
    if (outcome.status === 'success') onSuccess?.();
  }

  const errorText = error
    ? t(`errors.${error.key}`, {
        provider: error.provider ? t(`providers.${error.provider}`) : '',
      })
    : null;

  return (
    <div className="flex flex-col gap-3">
      {PROVIDERS.map(({ id, logo, labelKey }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleSignIn(id)}
          disabled={pending !== null}
          aria-busy={pending === id}
          className="inline-flex items-center justify-center gap-3 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Image src={logo} alt="" width={20} height={20} aria-hidden="true" className="h-5 w-5" />
          <span>{pending === id ? t('signingIn') : t(labelKey)}</span>
        </button>
      ))}

      {errorText && (
        // aria-live so the failure reaches a screen reader without moving focus
        // away from the button the user just pressed.
        <p role="alert" aria-live="polite" className="text-sm font-medium text-error">
          {errorText}
        </p>
      )}
    </div>
  );
}
