'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, Lightbulb } from 'lucide-react';
import type { ClientQuestion } from '@/lib/quiz/types';
import { toArabicIndic } from '@/lib/quiz/numerals';

/**
 * One question per screen: text, tappable options, an optional تلميح reveal, and
 * a progress indicator. Selecting an option only marks the choice — there is no
 * correct/incorrect feedback here, because the correct answer never reaches the
 * browser; grading happens on the server after the whole quiz is submitted.
 * Selection is controlled by the parent so answers survive navigation.
 */

interface QuestionCardProps {
  question: ClientQuestion;
  index: number; // 0-based
  total: number;
  selected: number | null;
  isLast: boolean;
  onSelect: (index: number) => void;
  onNext: () => void;
}

export default function QuestionCard({
  question,
  index,
  total,
  selected,
  isLast,
  onSelect,
  onNext,
}: QuestionCardProps) {
  const t = useTranslations('quiz');
  const [hintShown, setHintShown] = useState(false);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-text-muted">
          {t('progress', { current: toArabicIndic(index + 1), total: toArabicIndic(total) })}
        </span>
        {question.hint && !hintShown && (
          <button
            type="button"
            onClick={() => setHintShown(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
            {t('hint')}
          </button>
        )}
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 lg:p-8">
        <h2 className="text-xl font-semibold leading-relaxed text-text sm:text-2xl">{question.question}</h2>

        {hintShown && question.hint && (
          <p className="mt-4 rounded-xl border border-hl-amber-border bg-hl-amber-bg px-4 py-3 text-hl-amber-text">
            {question.hint}
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {question.options.map((option, i) => {
            const isChosen = selected === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-pressed={isChosen}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-start text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    isChosen
                      ? 'border-primary bg-primary/10 text-text'
                      : 'border-border bg-surface-elevated text-text hover:border-primary/60 hover:bg-primary/5'
                  }`}
                >
                  <span className="min-w-0">{option}</span>
                  {isChosen && <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onNext}
          disabled={selected === null}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-lg font-bold text-primary-fg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLast ? t('showResults') : t('next')}
          <ArrowLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
