import { z } from 'zod';

/**
 * Lesson videos (feature 009): `content/videos.json` maps a lesson slug to the
 * one YouTube video shown on that lesson's page.
 *
 * Unlike the lesson schemas — which tolerate and drop bad sections — everything
 * here is strict and fatal. The file is small, hand-edited, and each entry ends
 * up as a third-party embed, so a typo must fail the build rather than ship a
 * page that silently lost its video or points an iframe at a malformed ID.
 *
 * `description`, `uploadDate` and `durationSeconds` are validated but not yet
 * rendered: they are the fields a later phase needs for VideoObject JSON-LD and
 * the video sitemap, kept here so that phase needs no data migration.
 */

/** A YouTube video ID is exactly 11 URL-safe base64 characters. */
export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const localized = z.strictObject({
  ar: z.string().trim().min(1),
  en: z.string().trim().min(1),
});

export const lessonVideoSchema = z.strictObject({
  youtubeId: z.string().regex(YOUTUBE_ID_PATTERN, 'must be an 11-character YouTube video ID'),
  title: localized,
  description: localized,
  /** ISO 8601: a calendar date, or a datetime carrying an offset (as YouTube publishes it). */
  uploadDate: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
  durationSeconds: z.number().int().positive(),
});

/** `{ <lesson slug>: video }`. Keys are checked against real lessons in {@link parseVideos}. */
export const videosFileSchema = z.record(z.string(), lessonVideoSchema);

export type LessonVideo = z.infer<typeof lessonVideoSchema>;
export type VideosFile = z.infer<typeof videosFileSchema>;

/**
 * Validate the raw contents of `content/videos.json`.
 *
 * Pure on purpose: the lesson slug list is an argument, so the cross-check
 * ("every key is an existing lesson") is unit-testable without real content.
 * Throws with a message naming the offending entry — never returns a partial map.
 */
export function parseVideos(raw: unknown, lessonSlugs: readonly string[]): VideosFile {
  const result = videosFileSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`content/videos.json is invalid:\n${z.prettifyError(result.error)}`);
  }

  const known = new Set(lessonSlugs);
  const unknown = Object.keys(result.data).filter((slug) => !known.has(slug));
  if (unknown.length > 0) {
    throw new Error(
      `content/videos.json is invalid: no lesson with slug ${unknown
        .map((slug) => `"${slug}"`)
        .join(', ')} (keys must match content/lessons/manifest.json)`,
    );
  }

  return result.data;
}

/**
 * Public URL of a lesson video's self-hosted poster. Posters live in
 * `public/videos/` (written by scripts/fetch-video-posters.mjs) so the CSP's
 * `img-src 'self'` never needs a YouTube thumbnail host.
 */
export function videoPosterSrc(slug: string): string {
  return `/videos/${slug}.jpg`;
}
