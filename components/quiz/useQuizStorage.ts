'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  BEST_KEY,
  FILTERS_KEY,
  parseBestScore,
  parseStoredFilters,
} from '@/lib/quiz/storage';
import type { QuizFilters } from '@/lib/quiz/types';

/**
 * localStorage-backed reads for the quiz, using the same external-store pattern
 * as {@link file://components/lessons/useLessonProgress.ts}: the SNAPSHOT is the
 * raw stored string (a primitive, so useSyncExternalStore's referential check is
 * happy), the server snapshot is a stable empty string (hydration-safe — the
 * server always paints defaults), and consumers parse the raw string via useMemo.
 * Writes elsewhere dispatch {@link QUIZ_STORAGE_EVENT} so all readers refresh.
 */

export const QUIZ_STORAGE_EVENT = 'arabsyntax-quiz-storage-change';

function makeRawSnapshot(key: string) {
  return () => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  };
}

const emptySnapshot = () => '';
const filtersSnapshot = makeRawSnapshot(FILTERS_KEY);
const bestSnapshot = makeRawSnapshot(BEST_KEY);

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === FILTERS_KEY || event.key === BEST_KEY) onChange();
  };
  window.addEventListener(QUIZ_STORAGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(QUIZ_STORAGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** Notify all readers in this tab that quiz storage changed. */
export function notifyQuizStorageChange(): void {
  window.dispatchEvent(new Event(QUIZ_STORAGE_EVENT));
}

/** Last-used filters (defaults on the server / before mount). */
export function useStoredFilters(): QuizFilters {
  const raw = useSyncExternalStore(subscribe, filtersSnapshot, emptySnapshot);
  return useMemo(() => parseStoredFilters(raw), [raw]);
}

/** Best score as a percentage, or null (null on the server / before mount). */
export function useBestScore(): number | null {
  const raw = useSyncExternalStore(subscribe, bestSnapshot, emptySnapshot);
  return useMemo(() => parseBestScore(raw), [raw]);
}
