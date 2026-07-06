'use client';

import { useTranslations } from 'next-intl';
import { Check, RefreshCw, RotateCcw, Trophy, X } from 'lucide-react';
import type { ClientQuestion, GradeResult } from '@/lib/quiz/types';
import { scoreTier } from '@/lib/quiz/scoring';
import { toArabicIndic } from '@/lib/quiz/numerals';

/**
 * End-of-quiz results: score, percentage, a tiered message, and a per-question
 * review. The correct answers are shown here for the first time — the server
 * returned them only in the grade response, after the user committed answers.
 */

interface QuizResultsProps {
  grade: GradeResult;
  questions: ClientQuestion[];
  answers: (number | null)[];
  bestScore: number | null;
  onRetake: () => void;
  onNew: () => void;
}

export default function QuizResults({
  grade,
  questions,
  answers,
  bestScore,
  onRetake,
  onNew,
}: QuizResultsProps) {
  const t = useTranslations('quiz');
  const { score, total } = grade;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const tier = scoreTier(percent);
  const isBest = bestScore !== null && percent >= bestScore;

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-border bg-surface p-8 text-center lg:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-10 w-10 text-primary" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-3xl font-bold text-text">{t('resultsTitle')}</h1>

        <p className="mt-4 text-5xl font-bold tabular-nums text-primary">
          {toArabicIndic(percent)}
          <span className="text-3xl">٪</span>
        </p>
        <p className="mt-2 text-lg text-text-body">
          {t('scoreLine', { correct: toArabicIndic(score), total: toArabicIndic(total) })}
        </p>

        {isBest && (
          <p className="mt-3 inline-block rounded-full bg-accent/15 px-4 py-1.5 text-sm font-semibold text-accent">
            {t('newBest')}
          </p>
        )}

        <p className="mt-6 text-lg leading-relaxed text-text">{t(`tier.${tier}`)}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-elevated px-6 py-3.5 font-bold text-text transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            {t('retake')}
          </button>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-primary-fg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            {t('newQuiz')}
          </button>
        </div>
      </div>

      {/* Per-question review — correct answers revealed only now, post-submission. */}
      <h2 className="mt-10 mb-4 text-xl font-bold text-text">{t('reviewHeading')}</h2>
      <ol className="space-y-4">
        {grade.results.map((r, i) => {
          const q = questions[i];
          const chosen = answers[i];
          const chosenText = chosen !== null ? q.options[chosen] : null;
          const correctText = r.correctIndex >= 0 ? q.options[r.correctIndex] : null;
          return (
            <li key={r.questionId} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    r.correct ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
                  }`}
                  aria-hidden="true"
                >
                  {r.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-text">
                    <span className="text-text-muted">
                      {t('questionN', { n: toArabicIndic(i + 1) })}
                    </span>{' '}
                    {q.question}
                  </p>
                  <p className={`mt-2 text-sm ${r.correct ? 'text-success' : 'text-error'}`}>
                    {t('yourAnswer')}: {chosenText ?? t('noAnswer')}
                  </p>
                  {!r.correct && correctText !== null && (
                    <p className="mt-1 text-sm text-success">
                      {t('correctAnswer')}: {correctText}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
