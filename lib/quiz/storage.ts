import type { QuizFilters } from './types';
import { DEFAULT_FILTERS } from './marhala';

/**
 * Best-effort localStorage persistence. The spec asks to persist NOTHING except
 * (optionally) last-used filters and best score — so that's all this touches.
 * Reads are split into pure `parse*(raw)` helpers (fed the raw stored string by
 * the external-store hook) and thin localStorage accessors; every write is
 * wrapped so a blocked/full store simply means we don't remember.
 */

export const FILTERS_KEY = 'arabsyntax-quiz-filters';
export const BEST_KEY = 'arabsyntax-quiz-best';

function readRaw(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Parse the raw stored filters string; falls back to defaults on any problem. */
export function parseStoredFilters(raw: string): QuizFilters {
  if (!raw) return DEFAULT_FILTERS;
  try {
    const parsed = JSON.parse(raw) as Partial<QuizFilters>;
    return {
      marhala: typeof parsed.marhala === 'string' ? parsed.marhala : DEFAULT_FILTERS.marhala,
      year: typeof parsed.year === 'string' ? parsed.year : DEFAULT_FILTERS.year,
      difficulty:
        parsed.difficulty === 'easy' ||
        parsed.difficulty === 'medium' ||
        parsed.difficulty === 'hard'
          ? parsed.difficulty
          : 'all',
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

/** Parse the raw stored best-score string into a 0–100 percentage, or null. */
export function parseBestScore(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

export function saveLastFilters(filters: QuizFilters): void {
  try {
    window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // best-effort
  }
}

/** Record a new percentage if it beats the stored best. Returns the (new) best. */
export function recordScore(percent: number): number {
  const rounded = Math.max(0, Math.min(100, Math.round(percent)));
  const prev = parseBestScore(readRaw(BEST_KEY));
  const best = prev === null ? rounded : Math.max(prev, rounded);
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // best-effort
  }
  return best;
}
