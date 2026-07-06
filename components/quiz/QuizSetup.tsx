'use client';

import { useTranslations } from 'next-intl';
import { BarChart3, GraduationCap, Rocket, Sparkles, Target } from 'lucide-react';
import {
  ALL_MARHALA,
  ALL_YEARS,
  DIFFICULTY_OPTIONS,
  MARAHIL,
  getMarhala,
} from '@/lib/quiz/marhala';
import type { Difficulty, QuizFilters } from '@/lib/quiz/types';
import { toArabicIndic } from '@/lib/quiz/numerals';

/**
 * The pre-quiz setup screen: pick a marhala (+ year when the marhala has more
 * than one), an optional difficulty, then start. Mirrors the shared card
 * aesthetic; forced RTL is applied by the page wrapper.
 */

interface QuizSetupProps {
  filters: QuizFilters;
  onChange: (filters: QuizFilters) => void;
  onStart: () => void;
  bestScore: number | null;
}

function OptionCard({
  active,
  onClick,
  title,
  hint,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-start transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
        active
          ? 'border-primary bg-primary/10 text-text'
          : 'border-border bg-surface-elevated text-text-body hover:border-primary/60'
      }`}
    >
      {icon && (
        <span className={`mt-0.5 shrink-0 ${active ? 'text-primary' : 'text-text-muted'}`} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-semibold text-text">{title}</span>
        {hint && <span className="mt-1 block text-sm text-text-muted">{hint}</span>}
      </span>
    </button>
  );
}

const DIFFICULTY_META: Record<
  Exclude<Difficulty | 'all', 'all'>,
  { hint: string; icon: React.ReactNode }
> = {
  easy: { hint: 'مناسب للمبتدئين', icon: <Sparkles className="h-5 w-5" /> },
  medium: { hint: 'لمن لديه معرفة جيّدة', icon: <BarChart3 className="h-5 w-5" /> },
  hard: { hint: 'تحدَّ نفسك واختبر فهمك', icon: <Target className="h-5 w-5" /> },
};

export default function QuizSetup({ filters, onChange, onStart, bestScore }: QuizSetupProps) {
  const t = useTranslations('quiz');
  const marhala = filters.marhala === ALL_MARHALA ? undefined : getMarhala(filters.marhala);
  const showYears = marhala !== undefined && marhala.years.length > 1;

  function pickMarhala(id: string) {
    onChange({ ...filters, marhala: id, year: ALL_YEARS });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
      {/* Info aside — echoes the mockup's left panel; stacks above the form on mobile. */}
      <aside className="rounded-2xl border border-border bg-surface p-6 lg:p-8">
        <GraduationCap className="h-10 w-10 text-primary" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold text-text">{t('asideTitle')}</h2>
        <p className="mt-2 text-text-body">{t('asideBody')}</p>
        <ul className="mt-6 space-y-3">
          {['asidePoint1', 'asidePoint2', 'asidePoint3'].map((key) => (
            <li key={key} className="rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-text-secondary">
              {t(key)}
            </li>
          ))}
        </ul>
        {bestScore !== null && (
          <p className="mt-6 rounded-xl bg-primary/10 px-4 py-3 text-center text-sm font-semibold text-primary">
            {t('bestScore', { score: toArabicIndic(bestScore) })}
          </p>
        )}
      </aside>

      <div className="space-y-8">
        {/* Step 1 — marhala */}
        <section aria-labelledby="quiz-step-marhala">
          <h3 id="quiz-step-marhala" className="mb-4 text-lg font-bold text-text">
            {t('stepMarhala')}
          </h3>
          <div role="radiogroup" aria-labelledby="quiz-step-marhala" className="grid gap-3 sm:grid-cols-2">
            <OptionCard active={filters.marhala === ALL_MARHALA} onClick={() => pickMarhala(ALL_MARHALA)} title={t('all')} />
            {MARAHIL.map((m) => (
              <OptionCard key={m.id} active={filters.marhala === m.id} onClick={() => pickMarhala(m.id)} title={m.label} />
            ))}
          </div>

          {showYears && (
            <div className="mt-4">
              <h4 className="mb-3 text-sm font-semibold text-text-secondary">{t('stepYear')}</h4>
              <div role="radiogroup" aria-label={t('stepYear')} className="flex flex-wrap gap-2">
                <YearPill active={filters.year === ALL_YEARS} onClick={() => onChange({ ...filters, year: ALL_YEARS })} label={t('all')} />
                {marhala!.years.map((y) => (
                  <YearPill
                    key={y.stage}
                    active={filters.year === y.stage}
                    onClick={() => onChange({ ...filters, year: y.stage })}
                    label={y.label}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Step 2 — difficulty */}
        <section aria-labelledby="quiz-step-difficulty">
          <h3 id="quiz-step-difficulty" className="mb-4 text-lg font-bold text-text">
            {t('stepDifficulty')}
          </h3>
          <div role="radiogroup" aria-labelledby="quiz-step-difficulty" className="grid gap-3 sm:grid-cols-2">
            {DIFFICULTY_OPTIONS.map((opt) => {
              const meta = opt.value === 'all' ? undefined : DIFFICULTY_META[opt.value];
              return (
                <OptionCard
                  key={opt.value}
                  active={filters.difficulty === opt.value}
                  onClick={() => onChange({ ...filters, difficulty: opt.value })}
                  title={opt.label}
                  hint={meta?.hint}
                  icon={meta?.icon}
                />
              );
            })}
          </div>
        </section>

        <button
          type="button"
          onClick={onStart}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-bold text-primary-fg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background sm:w-auto"
        >
          <Rocket className="h-5 w-5" aria-hidden="true" />
          {t('start')}
        </button>
      </div>
    </div>
  );
}

function YearPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
        active
          ? 'border-primary bg-primary text-primary-fg'
          : 'border-border bg-surface-elevated text-text-body hover:border-primary/60'
      }`}
    >
      {label}
    </button>
  );
}
