import { z } from 'zod';

/**
 * Two-layer lesson schema (frozen for Phase 1).
 *
 * Layer 1 — AR structural schema: the source of truth for every section's
 *   shape (type, style, underlined, headers, rows, quote metadata, labels).
 * Layer 2 — EN translation overlay: type-less, attached by `lesson_id` +
 *   `section.id`. Every field optional; missing/empty falls back to AR.
 *
 * Field names are kept snake_case to match the raw JSON so the schemas parse
 * the files directly with no key transforms.
 *
 * Coverage notes baked into the shapes below (verified across all 100 files):
 *   - section `type` ∈ {paragraph, example, heading, highlight, list, quote, table, question}
 *   - example `style` ∈ {sentences, word-pairs, words}
 *   - highlight `label` present 307/308 → optional; EN `label_en` 306 → optional
 *   - quote carries Quran metadata AND/OR poetry metadata → all optional
 *   - AR example items are `string | {text, underlined[]}`
 *   - EN overlay items/cells are `string | {transliteration?, text?}` (positional)
 */

// ── Shared leaf shapes ──────────────────────────────────────────────────────

/** AR example item: a bare sentence, or a sentence with words to underline. */
const arExampleItem = z.union([
  z.string(),
  z.object({
    text: z.string(),
    underlined: z.array(z.string()).optional(),
  }),
]);

/** EN overlay cell/item: positional, index-matched to its AR counterpart. */
const enOverlayItem = z.union([
  z.string(),
  z.object({
    transliteration: z.string().optional(),
    text: z.string().optional(),
  }),
]);

export const EXAMPLE_STYLES = ['sentences', 'word-pairs', 'words'] as const;

// ── Layer 1: AR structural sections (discriminated by `type`) ───────────────

const arParagraph = z.object({
  id: z.string(),
  type: z.literal('paragraph'),
  text: z.string(),
});

const arHeading = z.object({
  id: z.string(),
  type: z.literal('heading'),
  text: z.string(),
});

const arQuestion = z.object({
  id: z.string(),
  type: z.literal('question'),
  text: z.string(),
});

const arHighlight = z.object({
  id: z.string(),
  type: z.literal('highlight'),
  label: z.string().optional(), // 307/308; render nothing when absent
  text: z.string(),
});

const arQuote = z.object({
  id: z.string(),
  type: z.literal('quote'),
  text: z.string(),
  // Quran metadata (subset present only when is_quran)
  is_quran: z.boolean().optional(),
  surah: z.string().optional(),
  surah_number: z.number().optional(),
  ayah: z.number().optional(),
  ayah_start: z.number().optional(),
  ayah_end: z.number().optional(),
  // Poetry metadata (subset present only when is_poetry)
  is_poetry: z.boolean().optional(),
  poet: z.string().optional(),
  source: z.string().optional(),
});

const arList = z.object({
  id: z.string(),
  type: z.literal('list'),
  items: z.array(z.string()),
});

const arExample = z.object({
  id: z.string(),
  type: z.literal('example'),
  style: z.enum(EXAMPLE_STYLES).optional(),
  items: z.array(arExampleItem),
});

const arTable = z.object({
  id: z.string(),
  type: z.literal('table'),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())), // rectangular
});

/**
 * Strict per-section schema. The loader runs this with `safeParse` on each
 * raw section and DROPS any that fail (unknown/missing `type`) — mirroring the
 * Flutter app's enum filter. Do not wrap the whole sections array in this, or
 * one bad section would reject the entire lesson.
 */
export const arSectionSchema = z.discriminatedUnion('type', [
  arParagraph,
  arHeading,
  arQuestion,
  arHighlight,
  arQuote,
  arList,
  arExample,
  arTable,
]);

/**
 * AR file envelope. Sections are kept loose here (validated per-section by the
 * loader) so an unknown-type section is dropped, not fatal.
 */
export const arLessonFileSchema = z.object({
  lesson_id: z.string(),
  language: z.literal('ar'),
  title: z.string(),
  sections: z.array(z.record(z.string(), z.unknown())),
});

// ── Layer 2: EN translation overlay (type-less, by id) ──────────────────────

/**
 * EN overlay section: no `type`; attached to its AR section by `id`. Every
 * content field is optional and falls back to AR when missing/empty.
 *   - text       → paragraph/heading/question/highlight/quote text
 *   - label_en   → highlight label
 *   - items      → list (string[]) or example ({transliteration?,text?}[])
 *   - headers/rows → table (cell = string | {transliteration?,text?})
 *   - quote meta → surah_en / translation_source / numbers
 */
export const enSectionSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  label_en: z.string().optional(),
  items: z.array(enOverlayItem).optional(),
  headers: z.array(z.string()).optional(),
  rows: z.array(z.array(enOverlayItem)).optional(),
  // quote overlay metadata
  is_quran: z.boolean().optional(),
  surah_en: z.string().optional(),
  surah_number: z.number().optional(),
  translation_source: z.string().optional(),
  ayah: z.number().optional(),
  ayah_start: z.number().optional(),
  ayah_end: z.number().optional(),
});

export const enLessonFileSchema = z.object({
  lesson_id: z.string(),
  language: z.literal('en'),
  title: z.string(),
  sections: z.array(enSectionSchema),
});

// ── manifest.json ───────────────────────────────────────────────────────────

/**
 * Drives index ordering and EN titles: `{ en: {slug: englishTitle} }`.
 * Only `en` exists in the data; AR titles come from each AR file's `title`.
 * `ar` is kept optional in case a future manifest adds it.
 */
export const manifestSchema = z.object({
  en: z.record(z.string(), z.string()),
  ar: z.record(z.string(), z.string()).optional(),
});

// ── Inferred types ──────────────────────────────────────────────────────────

export type ArSection = z.infer<typeof arSectionSchema>;
export type ArSectionType = ArSection['type'];
export type ArLessonFile = z.infer<typeof arLessonFileSchema>;
export type EnSection = z.infer<typeof enSectionSchema>;
export type EnLessonFile = z.infer<typeof enLessonFileSchema>;
export type LessonsManifest = z.infer<typeof manifestSchema>;
