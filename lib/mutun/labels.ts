import type { MatnType } from './schema';

/**
 * Type-driven Arabic structural labels for a matn. These are derived strictly
 * from the matn `type` so no component hardcodes them or assumes a layout:
 *   - prose → أبواب / الباب / الفقرة, body rendered as prose paragraphs.
 *   - verse → أبيات / البيت, body rendered as صدر + عجز.
 *
 * `unitCountWord` is "أبواب" for BOTH types: a matn's units are always أبواب.
 * أبيات / البيت label the verse SECTIONS inside a باب, never the unit count.
 *
 * These are Arabic grammar terms that belong to the (always-Arabic) matn
 * presentation, not localizable UI chrome — hence they live here, not in the
 * i18n message catalogues.
 */
export interface MatnLabels {
  /** Word used after the unit count on a list card — أبواب for every matn. */
  unitCountWord: string;
  /** Plural label for the collection of sections shown within a باب. */
  sections: string;
  /** Singular label for one section (a فقرة in prose, a بيت in verse). */
  section: string;
}

const PROSE_LABELS: MatnLabels = {
  unitCountWord: 'أبواب',
  sections: 'الفقرات',
  section: 'الفقرة',
};

const VERSE_LABELS: MatnLabels = {
  unitCountWord: 'أبواب',
  sections: 'الأبيات',
  section: 'البيت',
};

export function labelsFor(type: MatnType): MatnLabels {
  return type === 'verse' ? VERSE_LABELS : PROSE_LABELS;
}
