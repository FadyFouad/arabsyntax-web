import { z } from 'zod';

/**
 * المتون (matn) data contract — identical field names to the mobile assets so
 * the same verified JSON parses directly here with no key transforms.
 *
 * Two files per matn:
 *   - manifest.json  → list metadata (`mutun[]`)
 *   - <id>.json      → the content file (`units[]`)
 *
 * A matn's `type` ("prose" | "verse") is the single source of truth that drives
 * labels and layout downstream — never hardcode prose/verse assumptions.
 *
 * Structural fact baked in below: BOTH matns' units are أبواب (`kind: "bab"`).
 * A بيت is NOT a unit — it is a `verse` section inside a باب. So al-Imriti's
 * unit count is 33 أبواب, not أبيات.
 */

export const MATN_ID_PATTERN = /^[a-z0-9_]+$/;
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const MATN_TYPES = ['prose', 'verse'] as const;

// ── Section (shared content model) ──────────────────────────────────────────
// These two matns only use `paragraph` (prose body / شرح) and `verse` (نظم),
// but the full section vocabulary is modelled so the schema matches the shared
// content format and rejects nothing valid. Unknown section types are dropped
// per-section by the loader (never fatal), mirroring the app's enum filter.

export const SECTION_TYPES = [
  'heading',
  'paragraph',
  'highlight',
  'quote',
  'list',
  'table',
  'example',
  'question',
  'verse',
] as const;

const baseSection = {
  type: z.enum(SECTION_TYPES),
  text: z.string().optional(),
  // verse hemistichs: present iff type === "verse"
  sadr: z.string().optional(),
  ajz: z.string().optional(),
};

/** Loose section: validated leniently so an unknown shape is droppable, not fatal. */
export const sectionSchema = z.object(baseSection).passthrough();
export type Section = z.infer<typeof sectionSchema>;

const sectionsEnvelope = z.object({
  sections: z.array(z.record(z.string(), z.unknown())),
});

// ── Unit (باب) ───────────────────────────────────────────────────────────────

export const unitSchema = z.object({
  order: z.number().int(),
  kind: z.string(), // both matns use "bab"
  title: z.string().optional(),
  body: sectionsEnvelope,
  sharh: sectionsEnvelope.optional(), // absent ⇒ no شرح affordance
});
export type Unit = z.infer<typeof unitSchema>;

// ── Content file (<id>.json) ──────────────────────────────────────────────────

export const matnContentSchema = z.object({
  id: z.string().regex(MATN_ID_PATTERN),
  titleAr: z.string(),
  titleEn: z.string(),
  author: z.string(),
  era: z.string(),
  level: z.enum(LEVELS),
  type: z.enum(MATN_TYPES),
  units: z.array(unitSchema),
});
export type MatnContent = z.infer<typeof matnContentSchema>;

// ── manifest.json ─────────────────────────────────────────────────────────────

export const manifestEntrySchema = z.object({
  id: z.string().regex(MATN_ID_PATTERN),
  titleAr: z.string(),
  titleEn: z.string(),
  author: z.string(),
  era: z.string(),
  level: z.enum(LEVELS),
  type: z.enum(MATN_TYPES),
  unitCount: z.number().int().nonnegative(),
});
export type ManifestEntry = z.infer<typeof manifestEntrySchema>;

export const manifestSchema = z.object({
  mutun: z.array(manifestEntrySchema),
});
export type MutunManifest = z.infer<typeof manifestSchema>;

export type MatnType = (typeof MATN_TYPES)[number];
export type MatnLevel = (typeof LEVELS)[number];
