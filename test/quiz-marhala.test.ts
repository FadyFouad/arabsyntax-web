import { describe, it, expect } from 'vitest';
import {
  ALL_MARHALA,
  ALL_YEARS,
  CATEGORY_ALL,
  filtersToCategory,
  getMarhala,
  MARAHIL,
} from '@/lib/quiz/marhala';
import type { QuizFilters } from '@/lib/quiz/types';

const filters = (over: Partial<QuizFilters>): QuizFilters => ({
  marhala: ALL_MARHALA,
  year: ALL_YEARS,
  difficulty: 'all',
  ...over,
});

describe('getMarhala', () => {
  it('finds a known marhala and returns undefined otherwise', () => {
    expect(getMarhala('prep')?.label).toBe('الإعدادي');
    expect(getMarhala('nope')).toBeUndefined();
  });

  it('exposes the three marāhil', () => {
    expect(MARAHIL.map((m) => m.id)).toEqual(['primary', 'prep', 'secondary']);
  });
});

describe('filtersToCategory', () => {
  it('collapses "all" to the all-category', () => {
    expect(filtersToCategory(filters({ marhala: ALL_MARHALA }))).toBe(CATEGORY_ALL);
  });

  it('uses the lone stage for a single-year marhala', () => {
    expect(filtersToCategory(filters({ marhala: 'primary' }))).toBe('primary');
  });

  it('uses the marhala id when all years are selected', () => {
    expect(filtersToCategory(filters({ marhala: 'prep', year: ALL_YEARS }))).toBe('prep');
  });

  it('uses the specific stage for a chosen year', () => {
    expect(filtersToCategory(filters({ marhala: 'secondary', year: 'secondaryTwo' }))).toBe(
      'secondaryTwo',
    );
  });

  it('falls back to the marhala id for an unknown year', () => {
    expect(filtersToCategory(filters({ marhala: 'prep', year: 'bogus' }))).toBe('prep');
  });

  it('falls back to the all-category for an unknown marhala', () => {
    expect(filtersToCategory(filters({ marhala: 'unknown' }))).toBe(CATEGORY_ALL);
  });
});
