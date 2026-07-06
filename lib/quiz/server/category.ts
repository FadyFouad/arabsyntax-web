import { MARAHIL } from '../marhala';
import type { Stage } from '../types';

/** Stage key for the bucket of questions with no stage (`unstaged.json`). */
export const UNSTAGED_KEY = 'unstaged';

/** Every graded stage across all marāhil, in catalogue order. */
export function allStages(): Stage[] {
  return MARAHIL.flatMap((m) => m.years.map((y) => y.stage));
}

/**
 * Resolve a category id from the API path into the concrete stage keys to draw
 * from. Accepts: `all` (every stage + unstaged), a multi-year marhala id
 * (`prep`/`secondary`), or a single stage key (`primary`, `midTwo`, …). Returns
 * `null` for an unrecognised id so the route can answer 400 instead of guessing.
 */
export function resolveCategory(id: string): string[] | null {
  if (id === 'all') return [...allStages(), UNSTAGED_KEY];

  const group = MARAHIL.find((m) => m.id === id && m.years.length > 1);
  if (group) return group.years.map((y) => y.stage);

  if ((allStages() as string[]).includes(id)) return [id];

  return null;
}
