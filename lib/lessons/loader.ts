import 'server-only';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  arLessonFileSchema,
  arSectionSchema,
  enLessonFileSchema,
  manifestSchema,
  type ArSection,
  type EnSection,
} from './schema';

export type Locale = 'ar' | 'en';

const LESSONS_DIR = path.join(process.cwd(), 'content', 'lessons');

// A slug is interpolated into a filesystem path below, and getLesson() is
// reachable with an attacker-controlled route param (dynamicParams). Restrict
// to the charset lesson filenames actually use (lowercase, digits, '_', '-')
// so no slug can contain '.' or '/' and traverse out of LESSONS_DIR.
const SLUG_PATTERN = /^[a-z0-9_-]+$/;

// ── Resolved model (consumed by the renderer) ───────────────────────────────
// Every node keeps the AR source AND the resolved EN overlay, so the /en page
// shows EN + transliteration today and a future AR side-by-side toggle is a
// render-layer change only — no loader rework.

export interface Attribution {
  isQuran?: boolean;
  isPoetry?: boolean;
  surahAr?: string;
  surahEn?: string;
  surahNumber?: number;
  ayah?: number;
  ayahStart?: number;
  ayahEnd?: number;
  translationSource?: string;
  poet?: string;
  source?: string;
}

export interface ExampleItem {
  ar: { text: string; underlined?: string[] };
  en?: { text?: string; transliteration?: string };
}

export interface TableCell {
  ar: string;
  en?: { text?: string; transliteration?: string };
}

export type ResolvedSection =
  | { id: string; type: 'paragraph' | 'heading' | 'question'; ar: string; en?: string }
  | { id: string; type: 'highlight'; labelAr?: string; labelEn?: string; ar: string; en?: string }
  | { id: string; type: 'quote'; ar: string; en?: string; attribution?: Attribution }
  | { id: string; type: 'list'; itemsAr: string[]; itemsEn?: string[] }
  | { id: string; type: 'example'; style?: string; items: ExampleItem[] }
  | { id: string; type: 'table'; headers: TableCell[]; rows: TableCell[][] };

export interface ResolvedLesson {
  slug: string;
  locale: Locale;
  title: string;
  /** First paragraph text in the requested locale — used as the meta description. */
  description: string;
  sections: ResolvedSection[];
}

export interface LessonSummary {
  slug: string;
  title: string;
}

// ── File access (build-time, memoized) ──────────────────────────────────────

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

let manifestCache: { en: Record<string, string>; ar?: Record<string, string> } | null = null;
function loadManifest() {
  if (!manifestCache) {
    manifestCache = manifestSchema.parse(readJson(path.join(LESSONS_DIR, 'manifest.json')));
  }
  return manifestCache;
}

/** AR title from the AR file's `title` (manifest carries only EN titles). Memoized. */
const arTitleCache = new Map<string, string>();
function arTitle(slug: string): string {
  if (arTitleCache.has(slug)) return arTitleCache.get(slug)!;
  let title = slug;
  try {
    const raw = readJson(path.join(LESSONS_DIR, 'ar', `${slug}.json`)) as { title?: unknown };
    if (typeof raw?.title === 'string') title = raw.title;
  } catch {
    // keep slug as fallback
  }
  arTitleCache.set(slug, title);
  return title;
}

/** Resolve a lesson's title for a locale: EN from manifest, AR from the file. */
function titleFor(slug: string, locale: Locale, manifest = loadManifest()): string {
  if (locale === 'en') return manifest.en[slug] ?? arTitle(slug);
  return manifest.ar?.[slug] ?? arTitle(slug);
}

/** Whether `slug` names a real lesson page (memoized set over {@link getAllSlugs}). */
let slugSetCache: Set<string> | null = null;
export function isLessonSlug(slug: string): boolean {
  if (!slugSetCache) slugSetCache = new Set(getAllSlugs());
  return slugSetCache.has(slug);
}

/** Ordered slug list, driven by manifest.json (falls back to ar/ dir listing). */
export function getAllSlugs(): string[] {
  const ordered = Object.keys(loadManifest().en);
  if (ordered.length > 0) return ordered;
  return readdirSync(path.join(LESSONS_DIR, 'ar'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5));
}

/** Index list for a locale, in manifest order, with canonical per-locale titles. */
export function getLessonIndex(locale: Locale): LessonSummary[] {
  return getAllSlugs().map((slug) => ({ slug, title: titleFor(slug, locale) }));
}

// ── Resolution ──────────────────────────────────────────────────────────────

function pick(en: string | undefined): string | undefined {
  // Field-by-field fallback: empty/missing EN resolves to undefined so the
  // renderer falls back to the AR value (en ?? ar).
  return en && en.trim() ? en : undefined;
}

function resolveExampleItems(ar: ArSection & { type: 'example' }, en?: EnSection): ExampleItem[] {
  const enItems = en?.items;
  return ar.items.map((item, i) => {
    const arItem = typeof item === 'string' ? { text: item } : { text: item.text, underlined: item.underlined };
    const e = enItems?.[i];
    const enItem = e === undefined ? undefined : typeof e === 'string' ? { text: e } : { text: e.text, transliteration: e.transliteration };
    return { ar: arItem, en: enItem };
  });
}

function resolveTable(ar: ArSection & { type: 'table' }, en?: EnSection) {
  const toCell = (arText: string, enCell?: string | { text?: string; transliteration?: string }): TableCell => ({
    ar: arText,
    en: enCell === undefined ? undefined : typeof enCell === 'string' ? { text: enCell } : { text: enCell.text, transliteration: enCell.transliteration },
  });

  // EN overlay accepted only on an exact row/column match — otherwise dropped
  // silently and AR is rendered (mirrors the app).
  const enHeaders = en?.headers;
  const enRows = en?.rows;
  const headerMatch = !!enHeaders && enHeaders.length === ar.headers.length;
  const rowsMatch =
    !!enRows &&
    enRows.length === ar.rows.length &&
    ar.rows.every((row, r) => (enRows[r]?.length ?? -1) === row.length);

  const headers = ar.headers.map((h, c) => toCell(h, headerMatch ? enHeaders![c] : undefined));
  const rows = ar.rows.map((row, r) => row.map((cell, c) => toCell(cell, rowsMatch ? enRows![r][c] : undefined)));
  return { headers, rows };
}

function resolveSection(ar: ArSection, en?: EnSection): ResolvedSection {
  switch (ar.type) {
    case 'paragraph':
    case 'heading':
    case 'question':
      return { id: ar.id, type: ar.type, ar: ar.text, en: pick(en?.text) };
    case 'highlight':
      return {
        id: ar.id,
        type: 'highlight',
        labelAr: ar.label,
        labelEn: pick(en?.label_en),
        ar: ar.text,
        en: pick(en?.text),
      };
    case 'quote': {
      const hasMeta = ar.is_quran || ar.is_poetry || en?.is_quran;
      const attribution: Attribution | undefined = hasMeta
        ? {
            isQuran: ar.is_quran ?? en?.is_quran,
            isPoetry: ar.is_poetry,
            surahAr: ar.surah,
            surahEn: en?.surah_en,
            surahNumber: ar.surah_number ?? en?.surah_number,
            ayah: ar.ayah ?? en?.ayah,
            ayahStart: ar.ayah_start ?? en?.ayah_start,
            ayahEnd: ar.ayah_end ?? en?.ayah_end,
            translationSource: en?.translation_source,
            poet: ar.poet,
            source: ar.source,
          }
        : undefined;
      return { id: ar.id, type: 'quote', ar: ar.text, en: pick(en?.text), attribution };
    }
    case 'list':
      return {
        id: ar.id,
        type: 'list',
        itemsAr: ar.items,
        itemsEn: en?.items?.every((i): i is string => typeof i === 'string') ? (en.items as string[]) : undefined,
      };
    case 'example':
      return { id: ar.id, type: 'example', style: ar.style, items: resolveExampleItems(ar, en) };
    case 'table':
      return { id: ar.id, type: 'table', ...resolveTable(ar, en) };
  }
}

// ── Public: load a fully-resolved lesson ────────────────────────────────────

const lessonCache = new Map<string, ResolvedLesson | null>();

export function getLesson(slug: string, locale: Locale): ResolvedLesson | null {
  if (!SLUG_PATTERN.test(slug)) return null;
  const key = `${locale}:${slug}`;
  if (lessonCache.has(key)) return lessonCache.get(key)!;

  let result: ResolvedLesson | null = null;
  try {
    const arRaw = arLessonFileSchema.parse(readJson(path.join(LESSONS_DIR, 'ar', `${slug}.json`)));

    let enById = new Map<string, EnSection>();
    try {
      const enRaw = enLessonFileSchema.parse(readJson(path.join(LESSONS_DIR, 'en', `${slug}.json`)));
      enById = new Map(enRaw.sections.map((s) => [s.id, s]));
    } catch {
      // EN file missing/invalid → AR-only fallback for the whole lesson.
    }

    const sections: ResolvedSection[] = [];
    for (const rawSection of arRaw.sections) {
      const parsed = arSectionSchema.safeParse(rawSection);
      if (!parsed.success) continue; // drop unknown/missing-type sections
      sections.push(resolveSection(parsed.data, enById.get(parsed.data.id)));
    }

    const firstParagraph = sections.find((s) => s.type === 'paragraph') as
      | { ar: string; en?: string }
      | undefined;
    const description = (locale === 'en' ? firstParagraph?.en ?? firstParagraph?.ar : firstParagraph?.ar) ?? '';

    result = {
      slug,
      locale,
      title: locale === 'en' ? loadManifest().en[slug] ?? arRaw.title : arRaw.title,
      description,
      sections,
    };
  } catch {
    result = null;
  }

  lessonCache.set(key, result);
  return result;
}
