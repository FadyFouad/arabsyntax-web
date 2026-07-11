'use client';

// 'use client' justification (constitution IV): decides visibility from the
// Firebase session and a Firestore read, and owns a <dialog>'s focus/dismiss
// behavior. Renders nothing until auth resolves to signed-in AND the user's
// `users/{uid}` document says the form was never completed nor skipped, so the
// prerendered HTML is unchanged and signed-out visitors trigger no Firebase
// traffic (SC-7 / FR-4 posture inherited from feature 006).

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useAuth } from './AuthProvider';
import { countryOptions } from '@/lib/countries';
import {
  LEARNER_GOALS,
  LEARNER_LEVELS,
  LEARNER_SOURCES,
  SCHOOL_STAGES,
  type LearnerGoal,
  type LearnerLevel,
  type LearnerSource,
  type SchoolStage,
} from '@/lib/firebase/contracts/learnerProfilePayload';

/**
 * Read-avoidance hint ONLY — the markers of record live on `users/{uid}`, which
 * is what keeps "never show again" true across browsers and devices. This key
 * just spares a Firestore read on every page load once THIS browser has seen
 * the marker exist (or has written it). It is set strictly after that fact, so
 * it can never suppress a form the document says should show.
 */
const DONE_KEY = 'arabsyntax-profile-form-done';

/** Stored enum value → camelCase message key (code style: camelCase keys). */
const MESSAGE_KEY: Record<string, string> = {
  language_improvement: 'languageImprovement',
  general_interest: 'generalInterest',
  social_media: 'socialMedia',
  sec_1: 'sec1',
  sec_2: 'sec2',
  sec_3: 'sec3',
};
const messageKey = (value: string) => MESSAGE_KEY[value] ?? value;

/**
 * Mounts once app-wide (layout AuthGate). Opens the post-sign-in profile form
 * when the signed-in user's document carries neither `learnerProfile` nor
 * `learnerProfileSkippedAt` — first sign-in, or a later one where the user
 * neither completed nor skipped. Deliberately NOT gated on "new user".
 */
export default function ProfileFormDialog() {
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  /** One document read per uid per page load, no matter how auth state churns. */
  const checkedUid = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'signedIn' || !user) {
      // Mirror AuthProvider's syncedUid: a sign-out ends the "already checked"
      // claim, so a re-sign-in on this same page load decides afresh from the
      // document (the next sign-in may be a different user, or the same user
      // whose markers changed elsewhere meanwhile).
      if (status === 'signedOut') checkedUid.current = null;
      return;
    }
    if (checkedUid.current === user.uid) return;
    checkedUid.current = user.uid;
    if (localStorage.getItem(DONE_KEY) === user.uid) return;

    let cancelled = false;
    void (async () => {
      try {
        const { checkShouldShowProfileForm } = await import('@/lib/firebase/learnerProfile');
        const show = await checkShouldShowProfileForm(user.uid);
        if (cancelled) return;
        if (show) {
          setOpen(true);
          const { logProfileFormShown } = await import('@/lib/firebase/analytics');
          void logProfileFormShown();
        } else {
          localStorage.setItem(DONE_KEY, user.uid);
        }
      } catch {
        // Read failed (offline, rules). Skip quietly — the next page load or
        // sign-in resolution will offer the form again. Never block anything.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, user]);

  // Sign-out while open dismisses without a skip write — no user, no writes.
  if (!open || status !== 'signedIn' || !user) return null;

  return <ProfileFormModal user={user} onClose={() => setOpen(false)} />;
}

function ProfileFormModal({ user, onClose }: { user: User; onClose: () => void }) {
  const t = useTranslations('profileForm');
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** Set the moment a submit or skip is committed, so no dismissal path can double-write. */
  const resolved = useRef(false);

  const [goal, setGoal] = useState<LearnerGoal | null>(null);
  const [level, setLevel] = useState<LearnerLevel | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [schoolStage, setSchoolStage] = useState<SchoolStage | null>(null);
  const [source, setSource] = useState<LearnerSource | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // The Apple case: the session has no name, so offer to capture one. The
  // payload builder is the enforcement point that an existing name is never
  // overwritten; this condition is just the UI mirror of it.
  const needsName = !user.displayName?.trim();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  /**
   * Any dismissal that is not a successful submit IS a skip — the skip link,
   * the close button, Escape, and the backdrop all land here. One marker
   * write, one analytics event, and the form closes immediately (the write is
   * not awaited: a slow network must not hold the page hostage).
   */
  const skip = useCallback(() => {
    if (resolved.current) return;
    resolved.current = true;

    const uid = user.uid;
    void (async () => {
      try {
        const { skipLearnerProfile } = await import('@/lib/firebase/learnerProfile');
        await skipLearnerProfile(uid);
        localStorage.setItem(DONE_KEY, uid);
      } catch {
        // Marker not written — the form may show again on a later sign-in.
      }
    })();
    void import('@/lib/firebase/analytics')
      .then(({ logProfileFormSkipped }) => logProfileFormSkipped())
      .catch(() => {});

    onClose();
  }, [user.uid, onClose]);

  const submit = useCallback(async () => {
    if (resolved.current || saving) return;
    setSaving(true);
    setError(false);

    try {
      const { submitLearnerProfile } = await import('@/lib/firebase/learnerProfile');
      // The single merge write of the whole flow (plus updatedAt inside it).
      const { fieldsFilled } = await submitLearnerProfile(user.uid, {
        goal,
        level,
        country,
        schoolStage,
        source,
        name,
        currentDisplayName: user.displayName,
      });
      resolved.current = true;
      localStorage.setItem(DONE_KEY, user.uid);

      void import('@/lib/firebase/analytics')
        .then(({ logProfileFormCompleted }) => logProfileFormCompleted(fieldsFilled, goal))
        .catch(() => {});

      onClose();
    } catch {
      // Keep the form open with its answers intact — retry or skip, user's call.
      setSaving(false);
      setError(true);
    }
  }, [user, goal, level, country, schoolStage, source, name, saving, onClose]);

  return (
    <dialog
      ref={dialogRef}
      // Escape triggers the native close; route it through the skip path so
      // "dismissed however" always means "asked and declined", written once.
      onClose={skip}
      // Padding-free dialog: it is the event target only when the click landed
      // on the backdrop itself (same pattern as AccountMenu's sign-in dialog).
      onClick={(event) => {
        if (event.target === dialogRef.current) skip();
      }}
      aria-labelledby="profile-form-title"
      className="m-auto max-h-[85dvh] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-background/80"
    >
      <form
        className="p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="profile-form-title" className="text-lg font-bold">
              {t('title')}
            </h2>
            <p className="mt-1 text-sm text-text-body">{t('subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={skip}
            aria-label={t('close')}
            className="rounded-lg p-1 text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {needsName && (
            <div>
              <label htmlFor="profile-form-name" className="text-sm font-semibold text-text">
                {t('nameLabel')}
              </label>
              <input
                id="profile-form-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('namePlaceholder')}
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <OptionPills
            legend={t('goalLabel')}
            options={LEARNER_GOALS}
            value={goal}
            onChange={setGoal}
            label={(value) => t(`goals.${messageKey(value)}`)}
          />

          {goal === 'thanaweya' && (
            <OptionPills
              legend={t('stageLabel')}
              options={SCHOOL_STAGES}
              value={schoolStage}
              onChange={setSchoolStage}
              label={(value) => t(`stages.${messageKey(value)}`)}
            />
          )}

          <OptionPills
            legend={t('levelLabel')}
            options={LEARNER_LEVELS}
            value={level}
            onChange={setLevel}
            label={(value) => t(`levels.${messageKey(value)}`)}
          />

          <CountryCombobox value={country} onChange={setCountry} />

          <OptionPills
            legend={t('sourceLabel')}
            options={LEARNER_SOURCES}
            value={source}
            onChange={setSource}
            label={(value) => t(`sources.${messageKey(value)}`)}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-error">
            {t('error')}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={skip}
            className="rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {t('skip')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-fg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/**
 * A single-select rendered as toggle pills. Tapping the selected pill clears
 * it — every question is optional, so deselection must be possible.
 */
function OptionPills<V extends string>({
  legend,
  options,
  value,
  onChange,
  label,
}: {
  legend: string;
  options: readonly V[];
  value: V | null;
  onChange: (next: V | null) => void;
  label: (value: V) => string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-text">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : option)}
              className={`rounded-xl border px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                selected
                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                  : 'border-border text-text-body hover:border-primary/50 hover:text-text'
              }`}
            >
              {label(option)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Searchable country select: a text input filtering the Intl-localized country
 * list. Stores the ISO code; shows the localized name. No default preselection.
 */
function CountryCombobox({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (code: string | null) => void;
}) {
  const t = useTranslations('profileForm');
  const locale = useLocale();
  const options = useMemo(() => countryOptions(locale), [locale]);

  const [query, setQuery] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const listId = useId();
  const inputId = useId();

  const selected = value ? (options.find((option) => option.code === value) ?? null) : null;
  const trimmed = query.trim();
  const filtered = trimmed ? options.filter((option) => option.name.includes(trimmed)) : options;

  return (
    <div
      // Close when focus leaves the whole widget (input + list), not on every
      // input blur — otherwise the option click never lands.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setListOpen(false);
      }}
      className="relative"
    >
      <label htmlFor={inputId} className="text-sm font-semibold text-text">
        {t('countryLabel')}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        value={selected ? selected.name : query}
        onChange={(event) => {
          onChange(null);
          setQuery(event.target.value);
          setListOpen(true);
        }}
        onFocus={() => setListOpen(true)}
        onKeyDown={(event) => {
          // Escape closes the option list only — preventDefault keeps it from
          // bubbling into the <dialog>'s cancel, which would skip the form.
          if (event.key === 'Escape' && listOpen) {
            event.preventDefault();
            setListOpen(false);
          }
          // Enter picks the top match instead of submitting the whole form
          // mid-search.
          if (event.key === 'Enter' && listOpen) {
            event.preventDefault();
            const top = filtered[0];
            if (trimmed && top) {
              onChange(top.code);
              setQuery('');
              setListOpen(false);
            }
          }
        }}
        placeholder={t('countryPlaceholder')}
        autoComplete="off"
        className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {listOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('countryLabel')}
          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-surface-elevated py-1 shadow-2xl shadow-black/30"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-text-muted">{t('countryEmpty')}</li>
          )}
          {filtered.map((option) => (
            <li key={option.code} role="option" aria-selected={option.code === value}>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  onChange(option.code);
                  setQuery('');
                  setListOpen(false);
                }}
                className={`w-full px-3 py-2 text-start text-sm transition-colors hover:bg-primary/10 hover:text-primary ${
                  option.code === value ? 'font-semibold text-primary' : 'text-text-body'
                }`}
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
