import { normalizeForCompare } from '@/lib/mutun/markup';

// Integrity rules for شرح ابن عقيل (spec 058 FR-041, spec 059 FR-020…FR-022),
// mirrored from the mobile app's test/features/mutun/data/_ibn_aqil_integrity.dart.
//
// Pure functions over decoded JSON, like mutun-alfiyya-integrity.ts, so the
// same rules run against the real content file AND against in-memory fixtures.

/** Exempt from the forbidden-marker check: the شرح carries every Alfiyya verse and names Ibn Malik throughout. */
export const IBN_AQIL_ID = 'ibn_aqil';

/** The شرح carries every Alfiyya verse, once, in order (spec 058 FR-021). */
export const IBN_AQIL_VERSE_COUNT = 1002;

/** Reader notes in the content (spec 059): one per footnote marker in the source. */
export const IBN_AQIL_NOTE_COUNT = 32;

/** A space before a lone period, not part of `...` (spec 059 FR-025). */
export const IBN_AQIL_SPACE_BEFORE_PERIOD = / \.(?!\.)/;

/** Label of a reader-note card (spec 059 D-1). */
export const IBN_AQIL_NOTE_LABEL = 'ملاحظة';

/** Reader-note ids are the source's footnote ids, e.g. `v1n-010`. */
export const IBN_AQIL_NOTE_ID = /^v[1-4]n-\d{3}$/;

/** The first بيت's صدر opens with this (tashkeel stripped). */
export const IBN_AQIL_OPENING = 'قال محمد';

/** Source markup the conversion must strip: page markers and the colophon (`<!--`), footnote markers (`[[n:…]]`). */
export const IBN_AQIL_LEFTOVER_MARKERS = ['<!--', '[[', ']]'];

/** The Alfiyya id of the nth verse (1-based), e.g. `alfiyya_0007`. */
export const alfiyyaVerseId = (n: number) => `alfiyya_${String(n).padStart(4, '0')}`;

type Json = Record<string, unknown>;

const sectionsOf = (unit: Json): Json[] => {
  const body = unit.body as { sections?: unknown } | undefined;
  return Array.isArray(body?.sections) ? (body.sections as Json[]) : [];
};

const nonEmpty = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

/** Every string value anywhere in `node`: titles, section text, صدر, عجز. */
function* stringsOf(node: unknown): Generator<string> {
  if (typeof node === 'string') yield node;
  else if (Array.isArray(node)) for (const value of node) yield* stringsOf(value);
  else if (node && typeof node === 'object') for (const value of Object.values(node)) yield* stringsOf(value);
}

/**
 * Every شرح-specific violation in `content` (the decoded ibn_aqil.json); empty
 * means it passes. The expected counts default to the real content's; fixtures
 * pass their own.
 */
export function ibnAqilViolations(
  content: Json,
  { expectedVerseCount = IBN_AQIL_VERSE_COUNT, expectedNoteCount = IBN_AQIL_NOTE_COUNT } = {},
): string[] {
  const units = Array.isArray(content.units) ? (content.units as Json[]) : [];
  if (units.length === 0) return ['ibn_aqil has no units'];

  const violations: string[] = [];
  const seenIds = new Set<string>();
  const seenNoteIds = new Set<string>();
  let verseCount = 0;
  let firstSadr: string | undefined;
  for (const unit of units) {
    const where = `unit ${String(unit.order)}`;
    for (const text of stringsOf(unit)) {
      for (const marker of IBN_AQIL_LEFTOVER_MARKERS) {
        if (text.includes(marker)) violations.push(`${where}: leftover source marker "${marker}"`);
      }
    }
    // Type of the section before the current one in this unit; a note card
    // directly follows its paragraph or another note (059 FR-022).
    let previous: string | undefined;
    for (const section of sectionsOf(unit)) {
      const type = section.type;
      if (type === 'highlight') {
        checkNote(section, where, previous, seenNoteIds, violations);
        previous = 'note';
        continue;
      }
      previous = typeof type === 'string' ? type : undefined;
      if (type === 'paragraph' && IBN_AQIL_SPACE_BEFORE_PERIOD.test(String(section.text ?? ''))) {
        violations.push(`${where}: paragraph with a space before a period`);
      }
      if (type !== 'verse') {
        // شواهد and paragraphs are not Alfiyya verses (058 FR-022).
        if ('id' in section) violations.push(`${where}: non-verse section (${String(type)}) with an id`);
        continue;
      }
      verseCount++;
      firstSadr ??= typeof section.sadr === 'string' ? section.sadr : '';
      if (!nonEmpty(section.sadr)) violations.push(`${where}: verse with empty صدر`);
      if (!nonEmpty(section.ajz)) violations.push(`${where}: verse with empty عجز`);

      const id = section.id;
      const expected = alfiyyaVerseId(verseCount);
      if (typeof id !== 'string' || id.length === 0) {
        violations.push(`${where}: verse ${verseCount} without an id`);
        continue;
      }
      if (seenIds.has(id)) violations.push(`${where}: duplicate verse id "${id}"`);
      seenIds.add(id);
      if (id !== expected) violations.push(`${where}: verse ${verseCount} has id "${id}", expected "${expected}"`);
    }
  }

  if (verseCount !== expectedVerseCount) {
    violations.push(`expected ${expectedVerseCount} verse sections, found ${verseCount}`);
  }
  if (seenNoteIds.size !== expectedNoteCount) {
    violations.push(`expected ${expectedNoteCount} reader notes, found ${seenNoteIds.size}`);
  }
  if (firstSadr === undefined || !normalizeForCompare(firstSadr).startsWith(IBN_AQIL_OPENING)) {
    violations.push(`opening بيت missing: first صدر must start with "${IBN_AQIL_OPENING}"`);
  }
  return violations;
}

/** A highlight in the شرح is a reader note (spec 059): a «ملاحظة» card with text and a `vXn-NNN` id, directly after its paragraph or another note. */
function checkNote(
  section: Json,
  where: string,
  previous: string | undefined,
  seenNoteIds: Set<string>,
  violations: string[],
) {
  const id = section.id;
  if (typeof id !== 'string' || !IBN_AQIL_NOTE_ID.test(id)) {
    violations.push(`${where}: highlight without a reader-note id (${id === undefined ? 'none' : String(id)})`);
    return;
  }
  if (seenNoteIds.has(id)) violations.push(`${where}: duplicate reader-note id "${id}"`);
  seenNoteIds.add(id);
  if (section.label !== IBN_AQIL_NOTE_LABEL) {
    violations.push(`${where}: note ${id} labelled "${String(section.label)}", expected "${IBN_AQIL_NOTE_LABEL}"`);
  }
  if (!nonEmpty(section.text)) violations.push(`${where}: note ${id} with empty text`);
  if (previous !== 'paragraph' && previous !== 'note') {
    violations.push(`${where}: note ${id} not directly after a paragraph (after ${previous ?? 'the unit start'})`);
  }
}
