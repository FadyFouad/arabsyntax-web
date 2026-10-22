import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { manifestSchema, matnContentSchema } from '@/lib/mutun/schema';
import { normalizeForCompare, stripTashkeel } from '@/lib/mutun/markup';
import { ALFIYYA_ID, alfiyyaViolations } from './mutun-alfiyya-integrity';
import { IBN_AQIL_ID, IBN_AQIL_NOTE_LABEL, ibnAqilViolations } from './mutun-ibn-aqil-integrity';
import { pagedUnits } from '@/lib/mutun/units';

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

  // Matn ids exempt from FORBIDDEN, keyed on the manifest id, never on a
  // filename. Only the Alfiyya and شرح ابن عقيل, whose texts legitimately
  // carry every marker; each gets its own positive checks in sections 7 and 8
  // instead (spec 057 FR-001…FR-003, spec 058 FR-041). Every other matn,
  // current or future, stays guarded: the list is derived from the manifest,
  // not hardcoded.
  const MARKER_EXEMPT_MATN_IDS = new Set([ALFIYYA_ID, IBN_AQIL_ID]);
  const guarded = manifest.mutun.filter((m) => !MARKER_EXEMPT_MATN_IDS.has(m.id));

  // Strip tashkeel first so a diacriticised match (e.g. "ألفيّة") can't slip past.
  const expectNoMarkers = (text: string, where: string) => {
    const haystack = stripTashkeel(text);
    for (const needle of FORBIDDEN) {
      expect(haystack.includes(needle), `found forbidden "${needle}" in ${where}`).toBe(false);
    }
  };

  it('the forbidden-marker exemption covers the Alfiyya and شرح ابن عقيل alone', () => {
    // A wider set would silently unguard another matn (FR-001/FR-002).
    expect([...MARKER_EXEMPT_MATN_IDS]).toEqual([ALFIYYA_ID, IBN_AQIL_ID]);
  });

  it.each(guarded)('$id.json contains none of the Alfiyya-mislabel substrings', ({ id }) => {
    expectNoMarkers(rawText(path.join(MUTUN, `${id}.json`)), `${id}.json`);
  });

  it.each(guarded)('manifest entry "$id" contains none of the Alfiyya-mislabel substrings', (entry) => {
    expectNoMarkers(JSON.stringify(entry), `manifest.json entry "${entry.id}"`);
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

// 7 ── ألفية ابن مالك positive checks (spec 057 FR-003) ─────────────────────────
describe('7. alfiyya integrity', () => {
  // Runs only once the content lands (FR-003a), so the guard can ship before
  // the content does.
  const alfiyyaFile = path.join(MUTUN, `${ALFIYYA_ID}.json`);
  it.skipIf(!existsSync(alfiyyaFile))(
    'alfiyya.json passes its own checks (opening بيت, verse-only, unique ids)',
    () => {
      expect(alfiyyaViolations(read(alfiyyaFile))).toEqual([]);
    },
  );

  describe('rules reject bad content', () => {
    type Section = Record<string, unknown>;
    const verse = (id: string, sadr = 'صدر', ajz = 'عجز'): Section => ({ type: 'verse', id, sadr, ajz });
    const matn = (babs: Section[][]) => ({
      id: ALFIYYA_ID,
      units: babs.map((sections, i) => ({ order: i + 1, kind: 'bab', title: `باب ${i + 1}`, body: { sections } })),
    });
    const validBabs = (): Section[][] => [
      [verse('alfiyya_0001', 'قَالَ مُحَمَّدٌ هُوَ ابْنُ مَالِكِ', 'أَحْمَدُ رَبِّي اللَّهَ خَيْرَ مَالِكِ'), verse('alfiyya_0002')],
      [verse('alfiyya_0003')],
    ];
    const violationsWith = (mutate: (babs: Section[][]) => void) => {
      const babs = validBabs();
      mutate(babs);
      return alfiyyaViolations(matn(babs));
    };

    it('a well-formed matn has no violations', () => {
      expect(alfiyyaViolations(matn(validBabs()))).toEqual([]);
    });

    it('an opening spelled with alef wasla (ٱبْنُ) is accepted', () => {
      const v = violationsWith((b) => {
        b[0][0].sadr = 'قَالَ مُحَمَّدٌ هُوَ ٱبْنُ مَالِكِ';
      });
      expect(v).toEqual([]);
    });

    it('a missing opening بيت is rejected', () => {
      const v = violationsWith((b) => b[0].shift());
      expect(v.some((m) => m.startsWith('opening بيت missing'))).toBe(true);
    });

    it('a non-verse section is rejected', () => {
      const v = violationsWith((b) => b[1].push({ type: 'paragraph', text: 'نثر' }));
      expect(v.some((m) => m.includes('non-verse section'))).toBe(true);
    });

    it('a verse with no عجز is rejected', () => {
      const v = violationsWith((b) => b[1].push(verse('alfiyya_0004', 'صدر', ' ')));
      expect(v.some((m) => m.includes('empty عجز'))).toBe(true);
    });

    it('a verse with no id is rejected', () => {
      const v = violationsWith((b) => b[1].push({ type: 'verse', sadr: 'صدر', ajz: 'عجز' }));
      expect(v.some((m) => m.includes('without an id'))).toBe(true);
    });

    it('a duplicate id is rejected, even across أبواب', () => {
      const v = violationsWith((b) => b[1].push(verse('alfiyya_0002')));
      expect(v).toContain('unit 2: duplicate verse id "alfiyya_0002"');
    });

    it.each(['alfiyya_1', 'alfiyya_00001', 'imriti_0004', 'alfiyya-0004'])('malformed id %s is rejected', (bad) => {
      const v = violationsWith((b) => b[1].push(verse(bad)));
      expect(v).toContain(`unit 2: malformed verse id "${bad}"`);
    });
  });
});

// 8 ── شرح ابن عقيل positive checks (spec 058 FR-041, spec 059 FR-020…FR-022) ──
describe('8. ibn_aqil integrity', () => {
  // Runs once the content lands (spec 058 PR 2w), so the guard ships first.
  const ibnAqilFile = path.join(MUTUN, `${IBN_AQIL_ID}.json`);
  it.skipIf(!existsSync(ibnAqilFile))(
    'ibn_aqil.json passes its own checks (1,002 Alfiyya ids in order, both hemistichs, no source markers)',
    () => {
      expect(ibnAqilViolations(read(ibnAqilFile))).toEqual([]);
    },
  );

  describe('rules reject bad content', () => {
    type Section = Record<string, unknown>;
    const verse = (id: string, sadr = 'صدر', ajz = 'عجز'): Section => ({ type: 'verse', id, sadr, ajz });
    const paragraph = (text: string): Section => ({ type: 'paragraph', text });
    const note = (id: string, label = IBN_AQIL_NOTE_LABEL, text = '[طه: 89] ملاحظة'): Section => ({
      type: 'highlight',
      label,
      id,
      text,
    });
    const matn = (babs: Section[][]) => ({
      id: IBN_AQIL_ID,
      units: babs.map((sections, i) => ({ order: i + 1, kind: 'bab', title: `باب ${i + 1}`, body: { sections } })),
    });
    const validBabs = (): Section[][] => [
      [
        paragraph('بسم الله الرحمن الرحيم'),
        verse('alfiyya_0001', 'قَالَ مُحَمَّدٌ هُوَ ٱبْنُ مَالكِ', 'أَحْمَدُ رَبِّي ٱللَّهَ خَيْرَ مَالكِ'),
        verse('alfiyya_0002'),
      ],
      [verse('alfiyya_0003'), paragraph('شرح البيت'), { type: 'quote', is_poetry: true, text: 'شطر\nشطر' }],
    ];
    // validBabs() with two notes after the paragraph of the second باب.
    const babsWithNotes = (): Section[][] => {
      const babs = validBabs();
      babs[1].splice(2, 0, note('v1n-001'), note('v1n-002'));
      return babs;
    };
    // Three verses, so fixtures expect 3; no notes unless a test adds them.
    const violationsOf = (babs: Section[][], notes = 0) =>
      ibnAqilViolations(matn(babs), { expectedVerseCount: 3, expectedNoteCount: notes });
    const violationsWith = (mutate: (babs: Section[][]) => void, notes = 0) => {
      const babs = validBabs();
      mutate(babs);
      return violationsOf(babs, notes);
    };
    const hasMatch = (v: string[], part: string) => v.some((m) => m.includes(part));

    it('a well-formed شرح has no violations', () => {
      expect(violationsOf(validBabs())).toEqual([]);
    });

    it('a page marker left in a paragraph is rejected', () => {
      const v = violationsWith((b) => (b[1][1] = paragraph('شرح <!-- ص 3 --> البيت')));
      expect(hasMatch(v, 'leftover source marker "<!--"')).toBe(true);
    });

    it('a footnote marker left in a verse is rejected', () => {
      const v = violationsWith((b) => (b[0][2] = verse('alfiyya_0002', 'صدر', 'عجز[[n:v1n-001]]')));
      expect(hasMatch(v, '"[["')).toBe(true);
      expect(hasMatch(v, '"]]"')).toBe(true);
    });

    it('a leftover marker in a باب title is rejected', () => {
      const content = matn(validBabs());
      content.units[1].title = 'باب <!-- ص 9 -->';
      expect(hasMatch(ibnAqilViolations(content, { expectedVerseCount: 3, expectedNoteCount: 0 }), '"<!--"')).toBe(
        true,
      );
    });

    it('a duplicate verse id is rejected', () => {
      const v = violationsWith((b) => (b[1][0] = verse('alfiyya_0002')));
      expect(hasMatch(v, 'duplicate verse id "alfiyya_0002"')).toBe(true);
    });

    it('ids out of order are rejected', () => {
      const v = violationsWith((b) => {
        b[0][2] = verse('alfiyya_0003');
        b[1][0] = verse('alfiyya_0002');
      });
      expect(hasMatch(v, 'verse 2 has id "alfiyya_0003", expected "alfiyya_0002"')).toBe(true);
    });

    it('a verse with no id is rejected', () => {
      const v = violationsWith((b) => (b[1][0] = { type: 'verse', sadr: 'صدر', ajz: 'عجز' }));
      expect(hasMatch(v, 'verse 3 without an id')).toBe(true);
    });

    it('a verse with no عجز or no صدر is rejected', () => {
      expect(hasMatch(violationsWith((b) => (b[1][0] = verse('alfiyya_0003', 'صدر', ' '))), 'empty عجز')).toBe(true);
      expect(hasMatch(violationsWith((b) => (b[1][0] = verse('alfiyya_0003', ''))), 'empty صدر')).toBe(true);
    });

    it('a missing or extra verse is rejected', () => {
      expect(violationsWith((b) => b[1].shift())).toContain('expected 3 verse sections, found 2');
      expect(violationsWith((b) => b[1].push(verse('alfiyya_0004')))).toContain('expected 3 verse sections, found 4');
    });

    it('a شاهد carrying an id is rejected', () => {
      const v = violationsWith((b) => (b[1][2].id = 'alfiyya_0004'));
      expect(hasMatch(v, 'non-verse section (quote) with an id')).toBe(true);
    });

    it('a wrong opening بيت is rejected', () => {
      const v = violationsWith((b) => (b[0][1] = verse('alfiyya_0001', 'كَلَامُنَا لَفْظٌ مُفِيدٌ')));
      expect(v.some((m) => m.startsWith('opening بيت missing'))).toBe(true);
    });

    it('the real content is held to all 1,002 verses and 32 notes', () => {
      const v = ibnAqilViolations(matn(validBabs()));
      expect(v).toContain('expected 1002 verse sections, found 3');
      expect(v).toContain('expected 32 reader notes, found 0');
    });

    it('notes directly after their paragraph pass', () => {
      expect(violationsOf(babsWithNotes(), 2)).toEqual([]);
    });

    it('a missing or extra note is rejected', () => {
      expect(violationsOf(babsWithNotes())).toContain('expected 0 reader notes, found 2');
      expect(violationsOf(babsWithNotes(), 3)).toContain('expected 3 reader notes, found 2');
    });

    it('a note not directly after a paragraph is rejected', () => {
      const afterVerse = violationsWith((b) => b[0].push(note('v1n-001')), 1);
      expect(hasMatch(afterVerse, 'note v1n-001 not directly after a paragraph')).toBe(true);
      const atStart = violationsWith((b) => b[1].unshift(note('v1n-001')), 1);
      expect(hasMatch(atStart, '(after the unit start)')).toBe(true);
    });

    it('a duplicate note id is rejected', () => {
      const babs = babsWithNotes();
      babs[1][3] = note('v1n-001');
      expect(hasMatch(violationsOf(babs, 1), 'duplicate reader-note id "v1n-001"')).toBe(true);
    });

    it('a note with the wrong label or no text is rejected', () => {
      const wrongLabel = babsWithNotes();
      wrongLabel[1][2] = note('v1n-001', 'تنبيه');
      expect(hasMatch(violationsOf(wrongLabel, 2), 'labelled "تنبيه"')).toBe(true);
      const empty = babsWithNotes();
      empty[1][2] = note('v1n-001', IBN_AQIL_NOTE_LABEL, ' ');
      expect(hasMatch(violationsOf(empty, 2), 'note v1n-001 with empty text')).toBe(true);
    });

    it.each(['v5n-001', 'v1n-1', 'alfiyya_0004', ''])('a highlight with note id %j is rejected', (bad) => {
      const babs = babsWithNotes();
      babs[1][2] = note(bad);
      expect(hasMatch(violationsOf(babs, 1), 'highlight without a reader-note id')).toBe(true);
    });

    it('a highlight with no id is rejected', () => {
      const babs = babsWithNotes();
      delete babs[1][2].id;
      expect(hasMatch(violationsOf(babs, 1), 'highlight without a reader-note id (none)')).toBe(true);
    });

    it('a space before a period in a paragraph is rejected, an ellipsis is not', () => {
      const spaced = violationsWith((b) => (b[1][1] = paragraph('قام زيدٌ . والكلمة')));
      expect(hasMatch(spaced, 'paragraph with a space before a period')).toBe(true);
      expect(violationsWith((b) => (b[1][1] = paragraph('قام زيدٌ ... والكلمة. وكذا')))).toEqual([]);
    });

    it('a note id on a شاهد or paragraph is still rejected', () => {
      const onQuote = violationsWith((b) => (b[1][2].id = 'v1n-001'));
      expect(hasMatch(onQuote, 'non-verse section (quote) with an id')).toBe(true);
      const onParagraph = violationsWith((b) => (b[1][1].id = 'v1n-001'));
      expect(hasMatch(onParagraph, 'non-verse section (paragraph) with an id')).toBe(true);
    });
  });
});

// 9 ── Paged matns (one page per باب) ─────────────────────────────────────────
describe('9. paged matns', () => {
  const paged = manifest.mutun.filter((m) => m.paged === true);

  it('only شرح ابن عقيل is paged; every other matn keeps its single page', () => {
    expect(paged.map((m) => m.id)).toEqual([IBN_AQIL_ID]);
  });

  // Every باب needs a slug (its first verse id) to get a page, and a title to
  // name it in the index, the <h1> and the <title>.
  it.each(paged)('$id: every باب has a unique slug and a title', ({ id }) => {
    const matn = matnContentSchema.parse(read(path.join(MUTUN, `${id}.json`)));
    const units = pagedUnits(matn);
    expect(units.length).toBe(matn.units.length);
    expect(new Set(units.map((u) => u.slug)).size).toBe(units.length);
    for (const u of units) expect((u.unit.title ?? '').trim().length, `باب ${u.slug} has no title`).toBeGreaterThan(0);
  });
});
