import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';

// Both loaders open with `import 'server-only'`, which throws outside a React
// Server Component (i.e. here). Neutralize it — same as lessons-loader.test.ts.
vi.mock('server-only', () => ({}));

const { getAllLessonVideos, getLessonVideo } = await import('@/lib/videos/loader');
const { getAllSlugs } = await import('@/lib/lessons/loader');
const { videoPosterSrc, YOUTUBE_ID_PATTERN } = await import('@/lib/videos/schema');

// ─────────────────────────────────────────────────────────────────────────────
// The loader against the REAL content/videos.json. Doubles as the content-
// integrity guard for the file: if an entry is invalid, getAllLessonVideos()
// throws and every test here fails — the same failure the build would hit.
// (Injected failures — unreadable / invalid file — are in videos-loader-errors.)
// ─────────────────────────────────────────────────────────────────────────────

describe('videos loader (real content)', () => {
  it('loads and validates content/videos.json', () => {
    const videos = getAllLessonVideos();
    expect(Object.keys(videos).length).toBeGreaterThan(0);
    const lessonSlugs = new Set(getAllSlugs());
    for (const [slug, video] of Object.entries(videos)) {
      expect(lessonSlugs.has(slug), `${slug} is a lesson`).toBe(true);
      expect(video.youtubeId).toMatch(YOUTUBE_ID_PATTERN);
    }
  });

  it('memoizes: repeated calls return the same object', () => {
    expect(getAllLessonVideos()).toBe(getAllLessonVideos());
  });

  it('returns the video for a lesson that has one', () => {
    const video = getLessonVideo('aqsam_kalam');
    expect(video).not.toBeNull();
    expect(video?.youtubeId).toMatch(YOUTUBE_ID_PATTERN);
    expect(video?.title.ar).toBeTruthy();
    expect(video?.title.en).toBeTruthy();
  });

  it('returns null for a real lesson without a video', () => {
    const without = getAllSlugs().find((slug) => !(slug in getAllLessonVideos()));
    expect(without).toBeTruthy();
    expect(getLessonVideo(without!)).toBeNull();
  });

  it('returns null for unknown and prototype-named slugs', () => {
    expect(getLessonVideo('no-such-lesson')).toBeNull();
    expect(getLessonVideo('constructor')).toBeNull();
    expect(getLessonVideo('__proto__')).toBeNull();
    expect(getLessonVideo('')).toBeNull();
  });

  it('no two lessons share a video', () => {
    const ids = Object.values(getAllLessonVideos()).map((v) => v.youtubeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The page renders /videos/<slug>.jpg unconditionally; a forgotten
  // `npm run videos:posters` would otherwise ship a broken image.
  it('every video has its self-hosted poster on disk', () => {
    for (const slug of Object.keys(getAllLessonVideos())) {
      const file = path.join(process.cwd(), 'public', videoPosterSrc(slug));
      expect(existsSync(file), `missing ${file} — run \`npm run videos:posters\``).toBe(true);
    }
  });
});
