import type { Difficulty, QuizFilters, Stage } from './types';

/**
 * Client-safe catalogue of the education stages, grouped into the three marāhil
 * the setup screen offers, plus the mapping from a filter selection to the
 * single category id used in the API path (`/api/quiz/[category]`). The server
 * (lib/quiz/server/category.ts) resolves that id back into the concrete stages.
 */

export interface YearOption {
  /** The stage this year maps to (also the file stem in the manifest). */
  stage: Stage;
  label: string;
}

export interface Marhala {
  id: string;
  label: string;
  /** A single-entry marhala (الابتدائي) renders no year sub-choice. */
  years: YearOption[];
}

export const MARAHIL: Marhala[] = [
  {
    id: 'primary',
    label: 'الابتدائي',
    years: [{ stage: 'primary', label: 'الابتدائي' }],
  },
  {
    id: 'prep',
    label: 'الإعدادي',
    years: [
      { stage: 'midOne', label: 'الأول الإعدادي' },
      { stage: 'midTwo', label: 'الثاني الإعدادي' },
      { stage: 'midThree', label: 'الثالث الإعدادي' },
    ],
  },
  {
    id: 'secondary',
    label: 'الثانوي',
    years: [
      { stage: 'secondaryOne', label: 'الأول الثانوي' },
      { stage: 'secondaryTwo', label: 'الثاني الثانوي' },
      { stage: 'secondaryThree', label: 'الثالث الثانوي' },
    ],
  },
];

export const DIFFICULTY_OPTIONS: { value: Difficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'easy', label: 'سهل' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'صعب' },
];

export const ALL_MARHALA = 'all';
export const ALL_YEARS = 'all';
/** The category id for "every stage" — must match the server resolver. */
export const CATEGORY_ALL = 'all';

export const DEFAULT_FILTERS: QuizFilters = {
  marhala: ALL_MARHALA,
  year: ALL_YEARS,
  difficulty: 'all',
};

export function getMarhala(id: string): Marhala | undefined {
  return MARAHIL.find((m) => m.id === id);
}

/**
 * Collapse the filter selection into the single category id sent to the API:
 * `all`, a marhala id (`prep`/`secondary`) for a whole marhala, or a specific
 * stage key (`primary`, `midTwo`, …) for one year.
 */
export function filtersToCategory(filters: QuizFilters): string {
  if (filters.marhala === ALL_MARHALA) return CATEGORY_ALL;
  const marhala = getMarhala(filters.marhala);
  if (!marhala) return CATEGORY_ALL;
  if (marhala.years.length === 1) return marhala.years[0].stage;
  if (filters.year === ALL_YEARS) return marhala.id;
  const year = marhala.years.find((y) => y.stage === filters.year);
  return year ? year.stage : marhala.id;
}
