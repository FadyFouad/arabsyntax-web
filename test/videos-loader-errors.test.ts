import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// The videos loader is deliberately FATAL where the lessons loader degrades: it
// only runs during prerender, so throwing fails the build instead of shipping a
// lesson page that silently lost its video. The real file is valid, so these
// paths are reached by mocking node:fs (same technique as i3rab-loader-errors).
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));
// The slug cross-check consults the lessons loader; pin it so this test is about
// the videos loader alone.
vi.mock('@/lib/lessons/loader', () => ({ getAllSlugs: () => ['aqsam_kalam', 'elm_alnaho'] }));

// The curriculum order comes from the lesson tree; make it controllable.
let treeThrows = false;
vi.mock('@/lib/lessons/tree/loader', () => ({
  loadTreeDefinition: () => {
    if (treeThrows) throw new Error('ENOENT: tree.json');
    return { nodes: [{ lessonId: 'elm_alnaho' }, { lessonId: 'aqsam_kalam' }] };
  },
}));

let fileContents: string | null = null;
let reads = 0;

vi.mock('node:fs', () => ({
  readFileSync: (p: string) => {
    reads += 1;
    if (fileContents === null) throw Object.assign(new Error(`ENOENT: no such file, open '${p}'`), { code: 'ENOENT' });
    return fileContents;
  },
}));

async function freshLoader() {
  vi.resetModules(); // drop the loader's module-level `cache`
  return import('@/lib/videos/loader');
}

const entry = (overrides: Record<string, unknown> = {}) => ({
  youtubeId: 'H1Ml29ytjQ0',
  title: { ar: 'علم النحو', en: 'Arabic grammar' },
  summary: { ar: 'ملخص الدرس.', en: 'Lesson summary.' },
  description: { ar: 'وصف', en: 'Description' },
  uploadDate: '2026-11-14',
  durationSeconds: 151,
  ...overrides,
});

beforeEach(() => {
  fileContents = null;
  reads = 0;
  treeThrows = false;
});

describe('videos loader — failure paths', () => {
  it('throws when content/videos.json is missing', async () => {
    const { getAllLessonVideos } = await freshLoader();
    expect(() => getAllLessonVideos()).toThrow(/content\/videos\.json could not be read: ENOENT/);
  });

  it('throws when the file is not valid JSON', async () => {
    fileContents = '{ "elm_alnaho": ';
    const { getLessonVideo } = await freshLoader();
    expect(() => getLessonVideo('elm_alnaho')).toThrow(/content\/videos\.json could not be read/);
  });

  it('throws on a key that is not a lesson slug', async () => {
    fileContents = JSON.stringify({ alfeal: entry() });
    const { getLessonVideo } = await freshLoader();
    expect(() => getLessonVideo('elm_alnaho')).toThrow(/no lesson with slug "alfeal"/);
  });

  it('throws on a malformed YouTube ID', async () => {
    fileContents = JSON.stringify({ elm_alnaho: entry({ youtubeId: 'not-an-id' }) });
    const { getLessonVideo } = await freshLoader();
    expect(() => getLessonVideo('elm_alnaho')).toThrow(/11-character YouTube video ID/);
  });

  it('does not cache a failure: a fixed file loads on the next call', async () => {
    fileContents = JSON.stringify({ elm_alnaho: entry({ youtubeId: 'bad' }) });
    const { getLessonVideo } = await freshLoader();
    expect(() => getLessonVideo('elm_alnaho')).toThrow();
    fileContents = JSON.stringify({ elm_alnaho: entry() });
    expect(getLessonVideo('elm_alnaho')?.youtubeId).toBe('H1Ml29ytjQ0');
  });

  it('getVideoIndex follows the lesson tree, and falls back to manifest order without it', async () => {
    fileContents = JSON.stringify({ aqsam_kalam: entry({ youtubeId: 'HsAQqiWgIhg' }), elm_alnaho: entry() });
    const withTree = await freshLoader();
    expect(withTree.getVideoIndex().map((e) => e.slug)).toEqual(['elm_alnaho', 'aqsam_kalam']);

    treeThrows = true;
    const withoutTree = await freshLoader();
    expect(withoutTree.getVideoIndex().map((e) => e.slug)).toEqual(['aqsam_kalam', 'elm_alnaho']);
  });

  it('reads the file once, then serves every lookup from memory', async () => {
    fileContents = JSON.stringify({ elm_alnaho: entry() });
    const { getLessonVideo } = await freshLoader();
    expect(getLessonVideo('elm_alnaho')?.durationSeconds).toBe(151);
    expect(getLessonVideo('aqsam_kalam')).toBeNull();
    expect(getLessonVideo('elm_alnaho')).not.toBeNull();
    expect(reads).toBe(1);
  });
});
