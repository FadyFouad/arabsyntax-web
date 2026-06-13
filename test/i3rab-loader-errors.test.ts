import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// The i3rab loader's resilience lives in two catch paths that the real content
// files (all valid) never hit:
//   - readdirSync throws (missing/unreadable dir)        → treat as zero files
//   - a single file is unreadable / invalid JSON         → skip it, keep going
// We mock node:fs to inject those exact failure conditions and assert the loader
// degrades gracefully instead of throwing during a build/render.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));
// lessonHrefFor() consults the lessons index; stub it out so this test is about
// the i3rab loader alone (and doesn't touch real lesson content).
vi.mock('@/lib/lessons/loader', () => ({ getLessonIndex: () => [] }));

let dirEntries: string[] = [];
let readdirThrows = false;
const fileContents: Record<string, string> = {};

vi.mock('node:fs', () => ({
  readdirSync: () => {
    if (readdirThrows) throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    return dirEntries;
  },
  readFileSync: (p: string) => {
    const name = String(p).split('/').pop()!;
    if (name in fileContents) return fileContents[name];
    throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' });
  },
}));

async function freshLoader() {
  vi.resetModules(); // drop the loader's module-level `cache`
  return import('@/lib/i3rab/loader');
}

const validEntry = (slug: string) =>
  JSON.stringify({
    sentence: 'جاء زيدٌ',
    slug,
    words: [{ word: 'جاء', irab: 'فعل ماضٍ' }],
    explanation: '',
  });

beforeEach(() => {
  dirEntries = [];
  readdirThrows = false;
  for (const k of Object.keys(fileContents)) delete fileContents[k];
});

describe('i3rab loader — directory unreadable', () => {
  it('returns no entries (does not throw) when readdirSync fails', async () => {
    readdirThrows = true;
    const { getAllI3rabSlugs, getI3rabIndex } = await freshLoader();
    expect(getAllI3rabSlugs()).toEqual([]);
    expect(getI3rabIndex()).toEqual([]);
  });
});

describe('i3rab loader — a single bad file is skipped, not fatal', () => {
  it('drops a file whose contents are not valid JSON and keeps the valid ones', async () => {
    dirEntries = ['bad.json', 'good.json'];
    fileContents['bad.json'] = '{ this is not valid json'; // JSON.parse throws → continue
    fileContents['good.json'] = validEntry('good');
    const { getAllI3rabSlugs, getI3rabEntry } = await freshLoader();
    expect(getAllI3rabSlugs()).toEqual(['good']);
    expect(getI3rabEntry('good')).not.toBeNull();
    expect(getI3rabEntry('bad')).toBeNull();
  });

  it('also rejects a schema-valid file whose slug disagrees with its filename', async () => {
    dirEntries = ['mismatch.json', 'good.json'];
    fileContents['mismatch.json'] = validEntry('not-mismatch'); // slug ≠ filename → rejected
    fileContents['good.json'] = validEntry('good');
    const { getAllI3rabSlugs } = await freshLoader();
    expect(getAllI3rabSlugs()).toEqual(['good']);
  });
});
