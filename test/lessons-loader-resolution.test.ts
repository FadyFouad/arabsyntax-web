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
