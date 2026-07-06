'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import type { ClientQuestion, GradeResult, QuizFilters } from '@/lib/quiz/types';
import { filtersToCategory } from '@/lib/quiz/marhala';
import { recordScore } from '@/lib/quiz/storage';
import { fetchQuiz, submitQuiz } from './api';
import { notifyQuizStorageChange, useBestScore, useStoredFilters } from './useQuizStorage';
import QuizSetup from './QuizSetup';
import QuestionCard from './QuestionCard';
import QuizResults from './QuizResults';

/**
 * Client shell driving the quiz state machine:
 *   setup → loading → active → submitting → results  (+ error / empty)
 *
 * Questions are fetched from /api/quiz/[category] with the correct answers
 * already stripped, and grading happens on the server via /submit — the browser
 * never holds an answer key.
 */

type Phase = 'setup' | 'loading' | 'active' | 'submitting' | 'results' | 'error' | 'empty';

export default function QuizApp() {
  const t = useTranslations('quiz');

  const [phase, setPhase] = useState<Phase>('setup');
  const restoredFilters = useStoredFilters();
  const [override, setOverride] = useState<QuizFilters | null>(null);
  const filters = override ?? restoredFilters;
  const bestScore = useBestScore();

  const [activeFilters, setActiveFilters] = useState<QuizFilters>(restoredFilters);
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [token, setToken] = useState('');
  const [category, setCategory] = useState('all');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [runId, setRunId] = useState(0);

  const draw = useCallback(async (f: QuizFilters) => {
    setPhase('loading');
    const cat = filtersToCategory(f);
    try {
      const { token: tok, questions: qs } = await fetchQuiz(cat, f.difficulty);
      if (qs.length === 0) {
        setPhase('empty');
        return;
      }
      setQuestions(qs);
      setToken(tok);
      setCategory(cat);
      setAnswers(new Array(qs.length).fill(null));
      setIndex(0);
      setActiveFilters(f);
      setRunId((n) => n + 1);
      setPhase('active');
    } catch {
      setPhase('error');
    }
  }, []);

  const submit = useCallback(
    async (finalAnswers: (number | null)[]) => {
      setPhase('submitting');
      try {
        const result = await submitQuiz(category, token, finalAnswers);
        setGrade(result);
        const percent = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
        recordScore(percent);
        notifyQuizStorageChange();
        setPhase('results');
      } catch {
        setPhase('error');
      }
    },
    [category, token],
  );

  function onStart() {
    void draw(filters);
  }

  function onSelect(selectedIndex: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = selectedIndex;
      return next;
    });
  }

  function onNext() {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
    } else {
      void submit(answers);
    }
  }

  function onRetake() {
    // Same questions + token (still within its TTL); fresh attempt.
    setAnswers(new Array(questions.length).fill(null));
    setIndex(0);
    setGrade(null);
    setRunId((n) => n + 1);
    setPhase('active');
  }

  function onNewQuiz() {
    void draw(activeFilters);
  }

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p>{phase === 'submitting' ? t('submitting') : t('loading')}</p>
      </div>
    );
  }

  if (phase === 'error' || phase === 'empty') {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-lg text-text-body">{phase === 'empty' ? t('noQuestions') : t('loadError')}</p>
        <button
          type="button"
          onClick={() => setPhase('setup')}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold text-primary-fg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {t('backToSetup')}
        </button>
      </div>
    );
  }

  if (phase === 'active' && questions.length > 0) {
    return (
      <QuestionCard
        key={`${runId}-${index}`}
        question={questions[index]}
        index={index}
        total={questions.length}
        selected={answers[index]}
        isLast={index === questions.length - 1}
        onSelect={onSelect}
        onNext={onNext}
      />
    );
  }

  if (phase === 'results' && grade) {
    return (
      <QuizResults
        grade={grade}
        questions={questions}
        answers={answers}
        bestScore={bestScore}
        onRetake={onRetake}
        onNew={onNewQuiz}
      />
    );
  }

  return <QuizSetup filters={filters} onChange={setOverride} onStart={onStart} bestScore={bestScore} />;
}
