'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
 *
 * A `?lesson=<slug>` deep-link (the per-lesson quiz action on lesson pages)
 * skips setup and immediately draws a quiz scoped to that lesson. It is read
 * from `window.location` in a mount effect — NOT `useSearchParams` — so the
 * /quiz page stays fully prerendered (no Suspense/CSR bailout of the setup
 * screen, and the route stays static for the OpenNext static-assets cache).
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
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [token, setToken] = useState('');
  const [category, setCategory] = useState('all');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [runId, setRunId] = useState(0);

  const draw = useCallback(async (f: QuizFilters, lesson: string | null = null) => {
    setPhase('loading');
    // A lesson-scoped draw ignores the marhala/difficulty filters: the lesson is
    // the scope, and its pool is small enough that narrowing further would
    // routinely come back empty.
    const cat = lesson ? 'all' : filtersToCategory(f);
    try {
      const { token: tok, questions: qs } = await fetchQuiz(
        cat,
        lesson ? 'all' : f.difficulty,
        lesson ?? undefined,
      );
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
      setActiveLesson(lesson);
      setRunId((n) => n + 1);
      setPhase('active');
    } catch {
      setPhase('error');
    }
  }, []);

  // Honor a ?lesson= deep-link once on mount (guarded: React 19 strict-mode
  // re-runs effects, and this one kicks off a fetch + state machine).
  const bootedLessonLink = useRef(false);
  useEffect(() => {
    if (bootedLessonLink.current) return;
    bootedLessonLink.current = true;
    const slug = new URLSearchParams(window.location.search).get('lesson');
    if (slug) void draw(restoredFilters, slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design
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
    // Fresh questions from the same scope — including the lesson, if any.
    void draw(activeFilters, activeLesson);
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
