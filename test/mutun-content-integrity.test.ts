import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { manifestSchema, matnContentSchema } from '@/lib/mutun/schema';
import { normalizeForCompare, stripTashkeel } from '@/lib/mutun/markup';

// ─────────────────────────────────────────────────────────────────────────────
// المتون CONTENT-INTEGRITY GUARD — the six acceptance criteria, run against the
// REAL bundled assets (no mocks). A content edit that breaks the contract fails
// CI instead of shipping wrong/fabricated matn text to readers.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const MUTUN = path.join(ROOT, 'content', 'mutun');
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const rawText = (p: string) => readFileSync(p, 'utf8');

const manifest = manifestSchema.parse(read(path.join(MUTUN, 'manifest.json')));

interface Sec { type: string; text?: string; sadr?: string; ajz?: string }
const allSections = (id: string): { body: Sec[]; sharh: Sec[] } => {
  const matn = matnContentSchema.parse(read(path.join(MUTUN, `${id}.json`)));
  const body = matn.units.flatMap((u) => u.body.sections as unknown as Sec[]);
  const sharh = matn.units.flatMap((u) => (u.sharh?.sections ?? []) as unknown as Sec[]);
  return { body, sharh };
};

// 1 ── Drift guard ────────────────────────────────────────────────────────────
describe('1. drift guard: manifest ↔ content', () => {
  it('manifest parses and lists at least one matn', () => {
    expect(manifest.mutun.length).toBeGreaterThan(0);
  });

  it.each(manifest.mutun)('$id: content file exists and unitCount === units.length', (entry) => {
    const matn = matnContentSchema.parse(read(path.join(MUTUN, `${entry.id}.json`)));
    expect(matn.units.length).toBe(entry.unitCount);
    expect(matn.type).toBe(entry.type);
  });
});

// 2 ── Canonical opening ──────────────────────────────────────────────────────
describe('2. canonical opening of al-Ajurrumiyya', () => {
  it('first body section starts with the canonical الكلام definition', () => {
    const matn = matnContentSchema.parse(read(path.join(MUTUN, 'aljurrumiyya.json')));
    const first = (matn.units[0].body.sections[0] as unknown as Sec).text ?? '';
    expect(normalizeForCompare(first)).toMatch(/^الكلام هو اللفظ المركب المفيد بالوضع/);
  });
});

// 3 ── No wrong / fabricated text ─────────────────────────────────────────────
describe('3. no wrong/fabricated text in any matn asset', () => {
  const FORBIDDEN = ['كلامنا', 'كاستقم', 'ابن مالك', 'ألفية', 'الفية'];
  const files = ['manifest.json', 'aljurrumiyya.json', 'alimriti.json', 'qatr_alnada.json'];

  it.each(files)('%s contains none of the Alfiyya-mislabel substrings', (file) => {
    // Strip tashkeel first so a diacriticised match (e.g. "ألفيّة") can't slip past.
    const haystack = stripTashkeel(rawText(path.join(MUTUN, file)));
    for (const needle of FORBIDDEN) {
      expect(haystack.includes(needle), `found forbidden "${needle}" in ${file}`).toBe(false);
    }
  });
});

// 4 ── Type purity ─────────────────────────────────────────────────────────────
describe('4. type purity', () => {
  const prose = manifest.mutun.filter((m) => m.type === 'prose');
  const verse = manifest.mutun.filter((m) => m.type === 'verse');

  // A prose matn's body is paragraph-driven, but it MAY embed poetic شواهد as
  // `verse` sections (e.g. قطر الندى). Those must be well-formed (sadr+ajz) so
  // the prose renderer shows them as أبيات instead of dropping them. What stays
  // forbidden is a verse section in شرح (شرح is always prose).
  it.each(prose)('$id (prose): شرح has NO verse sections; any body شاهد is well-formed', (entry) => {
    const { body, sharh } = allSections(entry.id);
    expect(sharh.some((s) => s.type === 'verse')).toBe(false);
    for (const s of body.filter((s) => s.type === 'verse')) {
      expect((s.sadr ?? '').trim().length).toBeGreaterThan(0);
      expect((s.ajz ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  it.each(verse)('$id (verse): every body section is a verse with non-empty sadr AND ajz', (entry) => {
    const { body } = allSections(entry.id);
    expect(body.length).toBeGreaterThan(0);
    for (const s of body) {
      expect(s.type).toBe('verse');
      expect((s.sadr ?? '').trim().length).toBeGreaterThan(0);
      expect((s.ajz ?? '').trim().length).toBeGreaterThan(0);
    }
  });
});

// 5 ── No phantom text: matn components carry no hardcoded Arabic ──────────────
describe('5. no hardcoded Arabic in matn rendering surface', () => {
  const ARABIC = /[؀-ۿ]/;
  const dirs = [path.join(ROOT, 'components', 'mutun'), path.join(ROOT, 'app', '[locale]', 'mutun')];

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) return walk(full);
      return /\.(t|j)sx?$/.test(d.name) ? [full] : [];
    });

  const files = dirs.flatMap(walk);

  it('there is a matn rendering surface to check', () => expect(files.length).toBeGreaterThan(0));

  // Strip comments first: Arabic grammar terms (صدر/عجز/باب…) are allowed as
  // documentation, but no Arabic may appear in code/JSX/string literals — that
  // would be hardcoded matn text rather than data flowing from the JSON.
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it.each(files)('%s has no Arabic literal (all matn text flows from JSON)', (file) => {
    const code = stripComments(readFileSync(file, 'utf8'));
    expect(ARABIC.test(code), `Arabic literal found in ${path.relative(ROOT, file)}`).toBe(false);
  });
});

// 6 ── Empty vs error message strings are distinct (loader behavior in mutun-loader) ──
describe('6. empty and error states are semantically distinct', () => {
  const ar = read(path.join(ROOT, 'messages', 'ar.json')) as {
    mutun: { emptyTitle: string; errorTitle: string };
  };

  it('the empty message is the specified Arabic string', () => {
    expect(ar.mutun.emptyTitle).toBe('لا توجد متون متاحة بعد');
  });

  it('the error message is different from the empty message', () => {
    expect(ar.mutun.errorTitle).not.toBe(ar.mutun.emptyTitle);
  });
});
