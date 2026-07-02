'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  PROGRESS_STORAGE_KEY,
  parseCompleted,
  serializeCompleted,
  withCompletion,
} from '@/lib/lessons/progress/state';

/**
 * Client store for lesson completion, backed by localStorage. Mirrors the theme
 * toggle's external-store pattern so the server snapshot is a stable empty
 * string (no completion known at prerender → hydration-safe, and the tree paints
 * its unlock states only after mount).
 *
 * The SNAPSHOT is the raw stored string (a primitive), which keeps
 * useSyncExternalStore's referential-equality check happy. Consumers parse it
 * into a Set via {@link useCompletedLessons}, memoized on the raw string.
 */

const PROGRESS_CHANGE_EVENT = 'arabsyntax-lesson-progress-change';

function getRawSnapshot(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function getServerSnapshot(): string {
  return '';
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === PROGRESS_STORAGE_KEY) onChange();
  };
  window.addEventListener(PROGRESS_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(PROGRESS_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** Reactive set of completed lessonIds (empty on the server / before mount). */
export function useCompletedLessons(): ReadonlySet<string> {
  const raw = useSyncExternalStore(subscribe, getRawSnapshot, getServerSnapshot);
  return useMemo(() => parseCompleted(raw), [raw]);
}

/** Persist a completion change and notify all subscribers in this tab. */
export function setLessonComplete(lessonId: string, done: boolean): void {
  const next = withCompletion(parseCompleted(getRawSnapshot()), lessonId, done);
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, serializeCompleted(next));
  } catch {
    // Best-effort; a full/blocked store just means progress isn't remembered.
  }
  window.dispatchEvent(new Event(PROGRESS_CHANGE_EVENT));
}
