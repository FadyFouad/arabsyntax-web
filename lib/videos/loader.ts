import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getAllSlugs } from '@/lib/lessons/loader';
import { parseVideos, type LessonVideo, type VideosFile } from './schema';

const VIDEOS_FILE = path.join(process.cwd(), 'content', 'videos.json');

// ── File access (build-time, memoized) ──────────────────────────────────────
// Lesson pages are fully prerendered, so this only ever runs during the build.
// A missing, unparsable or invalid file THROWS — failing the build — instead of
// degrading the way the lessons loader does: see lib/videos/schema.ts.

let cache: VideosFile | null = null;

/** Every lesson video, keyed by lesson slug. Validated once, then memoized. */
export function getAllLessonVideos(): VideosFile {
  if (!cache) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(VIDEOS_FILE, 'utf8'));
    } catch (error) {
      throw new Error(`content/videos.json could not be read: ${(error as Error).message}`);
    }
    cache = parseVideos(raw, getAllSlugs());
  }
  return cache;
}

/** The video for a lesson, or `null` when the lesson has none (the common case). */
export function getLessonVideo(slug: string): LessonVideo | null {
  const videos = getAllLessonVideos();
  // Own-property check: `slug` is a route param, and a plain lookup would
  // resolve inherited keys such as "constructor".
  return Object.hasOwn(videos, slug) ? videos[slug] : null;
}

/**
 * Videos in curriculum order — the lesson manifest's order, not the key order
 * of videos.json — for the /videos index and the watch pages' static params.
 */
export function getVideoIndex(): { slug: string; video: LessonVideo }[] {
  const videos = getAllLessonVideos();
  return getAllSlugs()
    .filter((slug) => Object.hasOwn(videos, slug))
    .map((slug) => ({ slug, video: videos[slug] }));
}
