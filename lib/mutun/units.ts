import type { MatnContent, Unit } from './schema';

/**
 * Per-باب pages for a paged matn (manifest `paged: true`).
 *
 * A باب's URL slug is the id of its first verse (e.g. `alfiyya_0008`), never
 * its array position or `order`: inserting or splitting a باب leaves every
 * other URL intact, and heading wording (six bare «فصل» in شرح ابن عقيل) can
 * change without breaking links. A unit with no verse id has no slug, and the
 * content-integrity guard fails the build for a paged matn that has one.
 */

export const UNIT_SLUG_PATTERN = /^[a-z0-9_]+$/;

export interface PagedUnit {
  slug: string;
  unit: Unit;
  /** Numbers of the first and last verse in the باب (from their ids), for the index and meta description. */
  firstVerse: number;
  lastVerse: number;
}

type IdSection = { type?: unknown; id?: unknown };

const verseIds = (unit: Unit): string[] =>
  (unit.body.sections as IdSection[])
    .filter((s) => s.type === 'verse' && typeof s.id === 'string' && UNIT_SLUG_PATTERN.test(s.id))
    .map((s) => s.id as string);

/** Trailing number of a verse id: `alfiyya_0008` → 8. */
const verseNumber = (id: string) => Number(/(\d+)$/.exec(id)?.[1] ?? NaN);

/** The slug of `unit`, or null when it carries no verse id. */
export function unitSlug(unit: Unit): string | null {
  return verseIds(unit)[0] ?? null;
}

/** Every باب of `matn` that has a slug, in `order`. */
export function pagedUnits(matn: MatnContent): PagedUnit[] {
  return [...matn.units]
    .sort((a, b) => a.order - b.order)
    .flatMap((unit) => {
      const ids = verseIds(unit);
      if (ids.length === 0) return [];
      return [{ slug: ids[0], unit, firstVerse: verseNumber(ids[0]), lastVerse: verseNumber(ids[ids.length - 1]) }];
    });
}

/** The باب with `slug` plus its neighbours, or null for an unknown slug. */
export function findPagedUnit(
  matn: MatnContent,
  slug: string,
): { current: PagedUnit; previous: PagedUnit | null; next: PagedUnit | null } | null {
  const units = pagedUnits(matn);
  const i = units.findIndex((u) => u.slug === slug);
  if (i < 0) return null;
  return { current: units[i], previous: units[i - 1] ?? null, next: units[i + 1] ?? null };
}
