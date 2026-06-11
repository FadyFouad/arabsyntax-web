import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  arLessonFileSchema,
  arSectionSchema,
  enLessonFileSchema,
  manifestSchema,
} from '@/lib/lessons/schema';
import { i3rabSentenceSchema } from '@/lib/i3rab/schema';

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION / DATA-INTEGRITY GUARD.
//
// This is a content site: every page is rendered from a JSON file. A single
// malformed file (bad JSON, wrong shape, slug/filename mismatch, duplicate slug)
// ships a 500 or a silently-missing page to production. CI runs this so a content
// edit that breaks the contract fails the build instead of the user's browser.
//
// These tests read the REAL files — no mocks. They are intentionally strict.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const LESSONS = path.join(ROOT, 'content', 'lessons');
const I3RAB = path.join(ROOT, 'content', 'i3rab', 'ar');

const jsonFiles = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.json'));
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

describe('lessons manifest', () => {
  const manifest = read(path.join(LESSONS, 'manifest.json'));

  it('parses against manifestSchema', () => {
    expect(manifestSchema.safeParse(manifest).success).toBe(true);
  });

  it('every manifest slug has a corresponding AR content file', () => {
    for (const slug of Object.keys(manifest.en)) {
      expect(
        jsonFiles(path.join(LESSONS, 'ar')).includes(`${slug}.json`),
        `missing ar/${slug}.json`,
      ).toBe(true);
    }
  });
});

describe('AR lesson files', () => {
  const arDir = path.join(LESSONS, 'ar');
  const files = jsonFiles(arDir);

  it('there is at least one lesson', () => expect(files.length).toBeGreaterThan(0));

  it.each(jsonFiles(path.join(LESSONS, 'ar')))(
    '%s is valid JSON and matches the AR envelope schema',
    (file) => {
      const raw = read(path.join(arDir, file));
      const parsed = arLessonFileSchema.safeParse(raw);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
      expect((raw as { language: string }).language).toBe('ar');
    },
  );

  it('every AR section either matches a known section type or is intentionally droppable', () => {
    // Mirrors the loader: unknown sections are dropped, not fatal — but we still
    // surface how many would be dropped so a typo'd `type` is visible, not silent.
    let dropped = 0;
    for (const file of files) {
      const raw = read(path.join(arDir, file)) as { sections: unknown[] };
      for (const s of raw.sections) {
        if (!arSectionSchema.safeParse(s).success) dropped++;
      }
    }
    // Today every section is valid; this catches a regression that starts
    // silently dropping content. Update the expectation deliberately if the
    // data legitimately gains droppable sections.
    expect(dropped).toBe(0);
  });
});

describe('EN lesson overlay files', () => {
  const enDir = path.join(LESSONS, 'en');
  it.each(jsonFiles(path.join(LESSONS, 'en')))(
    '%s matches the EN overlay schema and declares language "en"',
    (file) => {
      const raw = read(path.join(enDir, file));
      const parsed = enLessonFileSchema.safeParse(raw);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    },
  );
});

describe('i3rab sentence files', () => {
  const files = jsonFiles(I3RAB);

  it('there is at least one i3rab entry', () => expect(files.length).toBeGreaterThan(0));

  it.each(jsonFiles(I3RAB))('%s matches the i3rab schema', (file) => {
    const parsed = i3rabSentenceSchema.safeParse(read(path.join(I3RAB, file)));
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('every i3rab file has slug === filename (loader rejects mismatches silently)', () => {
    for (const file of files) {
      const raw = read(path.join(I3RAB, file)) as { slug: string };
      expect(raw.slug, file).toBe(file.slice(0, -5));
    }
  });

  it('i3rab slugs are unique (a collision would silently hide an entry)', () => {
    const slugs = files.map((f) => (read(path.join(I3RAB, f)) as { slug: string }).slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every i3rab slug matches the URL-safe charset used for routing', () => {
    for (const file of files) {
      const raw = read(path.join(I3RAB, file)) as { slug: string };
      expect(raw.slug, file).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
