'use client';

// 'use client' justification (constitution IV): renders per-user state that only
// exists in the browser (Firebase session, entitlement, sync status), and owns
// the dialog/menu focus management.

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from './AuthProvider';
import SignInButtons from './SignInButtons';

/** First letter of the display name, else of the email, else a generic icon. */
function initial(displayName: string | null, email: string | null): string | null {
  const source = displayName?.trim() || email?.trim() || '';
  return source ? source[0]!.toUpperCase() : null;
}

/**
 * Header island: a sign-in entry point when signed out, an account menu when
 * signed in.
 *
 * Renders NOTHING until the auth status resolves after mount. That is not a
 * cosmetic choice — it keeps the prerendered HTML byte-identical to a build with
 * the flag off (SC-7), and it means a signed-out visitor never triggers a
 * Firebase fetch just by loading a page (FR-4).
 */
export default function AccountMenu() {
  const t = useTranslations('auth');
  const { status, user, isPremium, syncState, signOut } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // <dialog>.showModal() gives us the focus trap, the Escape handler, and inert
  // background content for free — all of which a hand-rolled overlay gets wrong.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dialogOpen && !dialog.open) dialog.showModal();
    if (!dialogOpen && dialog.open) dialog.close();
  }, [dialogOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  if (status === 'disabled' || status === 'loading') return null;

  if (status === 'signedOut' || !user) {
    return (
      <>
        {/* The label collapses to an icon on small screens: this control shares
            the header cluster with the theme and language toggles and the menu
            button, and a full-width Arabic label would crowd them out. */}
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label={t('signIn')}
          className="inline-flex items-center gap-2 rounded-xl border border-border p-2 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary sm:px-3 sm:py-1.5"
        >
          <LogIn className="h-4 w-4 sm:hidden" aria-hidden="true" />
          <span className="hidden sm:inline">{t('signIn')}</span>
        </button>

        <dialog
          ref={dialogRef}
          onClose={() => setDialogOpen(false)}
          // The dialog element is padding-free, so it is only ever the event
          // target when the click landed on the backdrop itself. Clicks inside
          // the content target a descendant and fall through untouched.
          onClick={(event) => {
            if (event.target === dialogRef.current) setDialogOpen(false);
          }}
          className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-background/80"
        >
          <div className="p-6">
            <h2 className="text-lg font-bold">{t('signInTitle')}</h2>
            <p className="mt-1 mb-5 text-sm text-text-body">{t('signInSubtitle')}</p>

            <SignInButtons onSuccess={() => setDialogOpen(false)} />

            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="mt-4 w-full rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {t('closeDialog')}
            </button>
          </div>
        </dialog>
      </>
    );
  }

  // C-4: the name and avatar come from the auth session, never from the
  // `provider` field on the Firestore profile (that field records the last
  // provider used, and says nothing about who the user is).
  const letter = initial(user.displayName, user.email);
  const name = user.displayName?.trim() || user.email || '';

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={t('openAccountMenu')}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-sm font-bold text-text transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {letter ?? <UserIcon className="h-4 w-4" aria-hidden="true" />}
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t('accountMenu')}
          className="absolute end-0 top-full z-50 mt-2 w-56 rounded-2xl border border-border bg-surface-elevated p-2 shadow-2xl shadow-black/30"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-text">{name}</p>

            {/* Cosmetic only — the badge gates nothing (D-4). */}
            {isPremium && (
              <p className="mt-1 inline-block rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {t('premium')}
              </p>
            )}

            {syncState === 'merging' && (
              <p className="mt-1 text-xs text-text-muted">{t('syncing')}</p>
            )}
            {syncState === 'error' && (
              <p role="status" className="mt-1 text-xs text-error">
                {t('syncError')}
              </p>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm font-medium text-text transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{t('signOut')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
