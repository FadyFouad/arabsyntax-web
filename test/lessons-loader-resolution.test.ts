import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// getLesson() resolves an AR source + an optional EN overlay into one model.
// The overlay rules are subtle and easy to regress:
//   - empty/missing EN field  → fall back to AR (pick())
//   - EN table accepted ONLY on an EXACT row/column dimension match, else dropped
//   - unknown/typeless AR sections are DROPPED, not fatal
//   - description = first paragraph, in the requested locale with AR fallback
// We mock node:fs so we can feed crafted, adversarial content and assert each
// branch directly — the real content files don't exercise the mismatch paths.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

// Virtual content keyed by path suffix. Each test can swap entries.
const files: Record<string, unknown> = {};
function bySuffix(p: string) {
  const key = Object.keys(files).find((k) => p.endsWith(k));
  if (!key) {
    const err = new Error(`ENOENT: ${p}`) as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    throw err;
  }
  return JSON.stringify(files[key]);
}

vi.mock('node:fs', () => ({
  readFileSync: (p: string) => bySuffix(p),
  readdirSync: () => Object.keys(files).filter((k) => k.startsWith('ar/')).map((k) => k.slice(3)),
}));

// Reset the loader's module-level caches between scenarios by re-importing.
async function freshLoader() {
  vi.resetModules();
  return import('@/lib/lessons/loader');
}

beforeEach(() => {
  for (const k of Object.keys(files)) delete files[k];
  files['manifest.json'] = { en: { demo: 'Demo Title (EN)' } };
});

describe('getLesson — title resolution per locale', () => {
  it('uses the manifest EN title for the /en page and the AR file title for /ar', async () => {
    files['ar/demo.json'] = {
      lesson_id: 'demo',
      language: 'ar',
      title: 'عنوان عربي',
      sections: [{ id: 'p1', type: 'paragraph', text: 'فقرة' }],
    };
    const { getLesson } = await freshLoader();
    expect(getLesson('demo', 'en')!.title).toBe('Demo Title (EN)');
    expect(getLesson('demo', 'ar')!.title).toBe('عنوان عربي');
  });
});

describe('getLesson — EN overlay field fallback (pick)', () => {
  it('falls back to AR text when the EN overlay text is empty or whitespace', async () => {
    files['ar/demo.json'] = {
      lesson_id: 'demo',
      language: 'ar',
      title: 't',
      sections: [
        { id: 'p1', type: 'paragraph', text: 'النص العربي' },
        { id: 'p2', type: 'paragraph', text: 'فقرة ثانية' },
      ],
    };
    files['en/demo.json'] = {
      lesson_id: 'demo',
      language: 'en',
      title: 't',
      sections: [
        { id: 'p1', text: '   ' }, // whitespace-only → must fall back to AR
        { id: 'p2', text: 'Second paragraph' },
      ],
    };
    const { getLesson } = await freshLoader();
    const sections = getLesson('demo', 'en')!.sections as Array<{ ar: string; en?: string }>;
    expect(sections[0].en).toBeUndefined(); // empty overlay collapsed to undefined
    expect(sections[1].en).toBe('Second paragraph');
  });

  it('falls back to AR-only for the whole lesson when the EN file is absent', async () => {
    files['ar/demo.json'] = {
      lesson_id: 'demo',
      language: 'ar',
      title: 't',
      sections: [{ id: 'p1', type: 'paragraph', text: 'فقط عربي' }],
    };
    const { getLesson } = await freshLoader();
    const sections = getLesson('demo', 'en')!.sections as Array<{ ar: string; en?: string }>;
    expect(sections[0].ar).toBe('فقط عربي');
    expect(sections[0].en).toBeUndefined();
  });
});

describe('getLesson — table overlay accepted only on exact dimension match', () => {
  const arTable = {
    lesson_id: 'demo',
    language: 'ar',
    title: 't',
    sections: [
      {
        id: 't1',
        type: 'table',
        headers: ['أ', 'ب'],
        rows: [
          ['1', '2'],
          ['3', '4'],
        ],
      },
    ],
  };

  it('applies the EN overlay when headers AND rows match dimensions exactly', async () => {
    files['ar/demo.json'] = arTable;
    files['en/demo.json'] = {
      lesson_id: 'demo',
      language: 'en',
      title: 't',
      sections: [{ id: 't1', headers: ['A', 'B'], rows: [['one', 'two'], ['three', 'four']] }],
    };
    const { getLesson } = await freshLoader();
    const table = getLesson('demo', 'en')!.sections[0] as {
      headers: Array<{ ar: string; en?: { text?: string } }>;
    };
    expect(table.headers[0].en?.text).toBe('A');
  });

  it('DROPS the EN overlay (renders AR) when the column count differs', async () => {
    files['ar/demo.json'] = arTable;
    files['en/demo.json'] = {
      lesson_id: 'demo',
      language: 'en',
      title: 't',
      sections: [{ id: 't1', headers: ['A'], rows: [['one', 'two'], ['three', 'four']] }], // 1 header vs 2
    };
    const { getLesson } = await freshLoader();
    const table = getLesson('demo', 'en')!.sections[0] as {
      headers: Array<{ ar: string; en?: unknown }>;
    };
    expect(table.headers[0].en).toBeUndefined(); // mismatch → AR-only, no crash
  });
});

describe('getLesson — robustness against bad sections', () => {
  it('drops an unknown-type section instead of failing the whole lesson', async () => {
    files['ar/demo.json'] = {
      lesson_id: 'demo',
      language: 'ar',
      title: 't',
      sections: [
        { id: 'p1', type: 'paragraph', text: 'صالح' },
        { id: 'x1', type: 'totally-unknown', text: 'بلا نوع' }, // must be dropped
        { id: 'h1', type: 'heading', text: 'عنوان' },
      ],
    };
    const { getLesson } = await freshLoader();
    const lesson = getLesson('demo', 'ar')!;
    expect(lesson.sections.map((s) => s.id)).toEqual(['p1', 'h1']);
  });

  it('returns null (not a throw) when the AR file is invalid JSON / wrong shape', async () => {
    files['ar/demo.json'] = { lesson_id: 'demo', language: 'ar' }; // missing title/sections
    const { getLesson } = await freshLoader();
    expect(getLesson('demo', 'ar')).toBeNull();
  });
});

describe('getLesson — description derivation', () => {
  it('uses the first paragraph in the requested locale', async () => {
    files['ar/demo.json'] = {
      lesson_id: 'demo',
      language: 'ar',
      title: 't',
      sections: [
        { id: 'h', type: 'heading', text: 'عنوان' }, // not a paragraph → skipped
        { id: 'p', type: 'paragraph', text: 'الوصف العربي' },
      ],
    };
    files['en/demo.json'] = {
      lesson_id: 'demo',
      language: 'en',
      title: 't',
      sections: [{ id: 'p', text: 'English description' }],
    };
    const { getLesson } = await freshLoader();
    expect(getLesson('demo', 'ar')!.description).toBe('الوصف العربي');
    expect(getLesson('demo', 'en')!.description).toBe('English description');
  });

  it('yields an empty description when no paragraph exists (no crash)', async () => {
    files['ar/demo.json'] = {
      lesson_id: 'demo',
      language: 'ar',
      title: 't',
      sections: [{ id: 'h', type: 'heading', text: 'عنوان فقط' }],
    };
    const { getLesson } = await freshLoader();
    expect(getLesson('demo', 'ar')!.description).toBe('');
  });
});

describe('getLesson — EN overlay missing for a specific section (file present, id absent)', () => {
  it('falls back to AR for a section whose id has no EN counterpart, while siblings translate', async () => {
    files['ar/demo.json'] = {
      lesson_id: 'demo',
      language: 'ar',
      title: 't',
      sections: [
        { id: 'p1', type: 'paragraph', text: 'فقرة بلا ترجمة' }, // no EN section with id p1
        { id: 'p2', type: 'paragraph', text: 'فقرة مترجمة' },
      ],
    };
    files['en/demo.json'] = {
      lesson_id: 'demo',
      language: 'en',
      title: 't',
      sections: [{ id: 'p2', text: 'Translated paragraph' }], // p1 deliberately absent
    };
    const { getLesson } = await freshLoader();
    const sections = getLesson('demo', 'en')!.sections as Array<{ ar: string; en?: string }>;
    expect(sections[0].en).toBeUndefined(); // missing overlay → AR-only
    expect(sections[1].en).toBe('Translated paragraph');
  });
});

describe('getLesson — example item overlay (positional, index-matched to AR)', () => {
  const arExample = {
    lesson_id: 'demo',
    language: 'ar',
    title: 't',
    sections: [
      {
        id: 'ex1',
        type: 'example',
        style: 'sentences',
        items: [
          'جملة أولى', // bare string
          { text: 'جملة ثانية', underlined: ['ثانية'] }, // object with underlined words
          'جملة ثالثة',
        ],
      },
    ],
  };

  it('overlays EN positionally and falls back to AR-only where the EN array is shorter', async () => {
    files['ar/demo.json'] = arExample;
    files['en/demo.json'] = {
      lesson_id: 'demo',
      language: 'en',
      title: 't',
      // Only 2 EN items for 3 AR items → index 2 has no overlay.
      sections: [
        { id: 'ex1', items: ['First sentence', { text: 'Second', transliteration: 'jumla thaniya' }] },
      ],
    };
    const { getLesson } = await freshLoader();
    const ex = getLesson('demo', 'en')!.sections[0] as {
      type: string;
      style?: string;
      items: Array<{ ar: { text: string; underlined?: string[] }; en?: { text?: string; transliteration?: string } }>;
    };
    expect(ex.type).toBe('example');
    expect(ex.style).toBe('sentences');
    // AR side preserves underlined metadata from the object-form item.
    expect(ex.items[1].ar.underlined).toEqual(['ثانية']);
    // EN overlay: string item → { text }, object item → { text, transliteration }.
    expect(ex.items[0].en).toEqual({ text: 'First sentence' });
    expect(ex.items[1].en).toEqual({ text: 'Second', transliteration: 'jumla thaniya' });
    // EN array shorter than AR → trailing item renders AR-only.
    expect(ex.items[2].en).toBeUndefined();
    expect(ex.items[2].ar.text).toBe('جملة ثالثة');
  });

  it('renders an example AR-only when the EN file omits the section entirely', async () => {
    files['ar/demo.json'] = arExample;
    files['en/demo.json'] = {
      lesson_id: 'demo',
      language: 'en',
      title: 't',
      sections: [], // no overlay for ex1 at all
    };
    const { getLesson } = await freshLoader();
    const ex = getLesson('demo', 'en')!.sections[0] as { items: Array<{ en?: unknown }> };
    expect(ex.items.every((i) => i.en === undefined)).toBe(true);
  });
});

describe('getLesson — table overlay dropped on a ROW-count mismatch (partial translation)', () => {
  it('renders AR-only when EN supplies fewer rows than AR', async () => {
    files['ar/demo.json'] = {
      lesson_id: 'demo',
      language: 'ar',
      title: 't',
      sections: [
        {
          id: 't1',
          type: 'table',
          headers: ['أ', 'ب'],
          rows: [
            ['1', '2'],
            ['3', '4'],
          ],
        },
      ],
    };
    files['en/demo.json'] = {
      lesson_id: 'demo',
      language: 'en',
      title: 't',
      // headers match (2), but only 1 row vs AR's 2 → rowsMatch is false.
      sections: [{ id: 't1', headers: ['A', 'B'], rows: [['one', 'two']] }],
    };
    const { getLesson } = await freshLoader();
    const table = getLesson('demo', 'en')!.sections[0] as {
      headers: Array<{ ar: string; en?: { text?: string } }>;
      rows: Array<Array<{ ar: string; en?: unknown }>>;
    };
    // Headers DID match → they overlay; rows did NOT → AR-only, no crash.
    expect(table.headers[0].en?.text).toBe('A');
    expect(table.rows[0][0].en).toBeUndefined();
    expect(table.rows[0][0].ar).toBe('1');
  });
});

describe('getAllSlugs — falls back to the ar/ directory listing when the manifest is empty', () => {
  it('lists slugs from disk when manifest.en has no entries', async () => {
    files['manifest.json'] = { en: {} }; // empty → triggers readdir fallback
    files['ar/foo.json'] = { lesson_id: 'foo', language: 'ar', title: 't', sections: [] };
    files['ar/bar.json'] = { lesson_id: 'bar', language: 'ar', title: 't', sections: [] };
    const { getAllSlugs } = await freshLoader();
    expect(new Set(getAllSlugs())).toEqual(new Set(['foo', 'bar']));
  });
});

describe('getLesson — caching', () => {
  it('returns a stable reference for repeated (slug, locale) calls', async () => {
    files['ar/demo.json'] = {
      lesson_id: 'demo',
      language: 'ar',
      title: 't',
      sections: [{ id: 'p', type: 'paragraph', text: 'x' }],
    };
    const { getLesson } = await freshLoader();
    expect(getLesson('demo', 'ar')).toBe(getLesson('demo', 'ar'));
  });
});
