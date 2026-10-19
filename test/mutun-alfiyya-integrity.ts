import { normalizeForCompare } from '@/lib/mutun/markup';

// Integrity rules for ألفية ابن مالك (spec 057, FR-003), mirrored from the
// mobile app's test/features/mutun/data/_alfiyya_integrity.dart.
//
// Pure functions over decoded JSON, so the same rules run against the real
// content file AND against in-memory fixtures. The fixtures prove each rule
// fails on bad content, even before content/mutun/alfiyya.json exists.

/** The only matn exempt from the forbidden-marker check: its own text carries every marker. */
export const ALFIYYA_ID = 'alfiyya';

/** Verse ids are `alfiyya_NNNN`: zero-padded to 4 digits, numbered across the whole matn (FR-020). */
export const ALFIYYA_VERSE_ID = /^alfiyya_\d{4}$/;

/** The Alfiyya opens with the مقدمة's first بيت (tashkeel stripped). */
export const ALFIYYA_OPENING = 'قال محمد هو ابن مالك';

/** Folds alef wasla (ٱ) into a plain alef: vocalized editions print «ٱبْنُ» where the reference has «ابن». */
const foldAlefWasla = (text: string) => text.replace(/ٱ/g, 'ا');

type Json = Record<string, unknown>;

const sectionsOf = (unit: Json): Json[] => {
  const body = unit.body as { sections?: unknown } | undefined;
  return Array.isArray(body?.sections) ? (body.sections as Json[]) : [];
};

const nonEmpty = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

/**
 * Every Alfiyya-specific integrity violation in `content` (the decoded
 * alfiyya.json); empty means it passes: the opening بيت is present, every
 * section is a verse with both hemistichs, and every verse carries a unique,
 * well-formed `id`.
 */
export function alfiyyaViolations(content: Json): string[] {
  const units = Array.isArray(content.units) ? (content.units as Json[]) : [];
  if (units.length === 0) return ['alfiyya has no units'];

  const violations: string[] = [];
  const firstSadr = sectionsOf(units[0])[0]?.sadr;
  if (typeof firstSadr !== 'string' || !foldAlefWasla(normalizeForCompare(firstSadr)).startsWith(ALFIYYA_OPENING)) {
    violations.push(`opening بيت missing: first صدر must start with "${ALFIYYA_OPENING}"`);
  }

  const seenIds = new Set<string>();
  for (const unit of units) {
    const where = `unit ${String(unit.order)}`;
    for (const section of sectionsOf(unit)) {
      if (section.type !== 'verse') {
        violations.push(`${where}: non-verse section (${String(section.type)})`);
        continue;
      }
      if (!nonEmpty(section.sadr)) violations.push(`${where}: verse with empty صدر`);
      if (!nonEmpty(section.ajz)) violations.push(`${where}: verse with empty عجز`);

      const id = section.id;
      if (typeof id !== 'string' || id.length === 0) {
        violations.push(`${where}: verse without an id`);
        continue;
      }
      if (!ALFIYYA_VERSE_ID.test(id)) violations.push(`${where}: malformed verse id "${id}"`);
      if (seenIds.has(id)) violations.push(`${where}: duplicate verse id "${id}"`);
      seenIds.add(id);
    }
  }
  return violations;
}
