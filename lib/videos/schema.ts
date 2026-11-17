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
 * Which field feeds what (feature 010):
 *   - `title`       → lesson-page facade, watch page, VideoObject, sitemap
 *   - `summary`     → watch page, /videos cards, VideoObject + sitemap description
 *   - `chapters`    → watch-page chapter list and VideoObject `hasPart` Clips
 *   - `description` → nothing. It is the YouTube description kept verbatim
 *                     (links, hashtags, timestamps and all) as the source record.
 */

/** A YouTube video ID is exactly 11 URL-safe base64 characters. */
export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const localized = z.strictObject({
  ar: z.string().trim().min(1),
  en: z.string().trim().min(1),
});

/** Longest allowed `summary`, per locale. */
export const SUMMARY_MAX_LENGTH = 300;

/**
 * A summary is 1–2 plain sentences shown on the page and handed to search
 * engines as the video's description, so it must be free of everything a
 * YouTube description accumulates: links, hashtags, chapter timestamps.
 */
const summaryText = z
  .string()
  .trim()
  .min(1)
  .max(SUMMARY_MAX_LENGTH)
  .refine((s) => !/[\r\n]/.test(s), 'must be a single line')
  .refine((s) => !/https?:\/\/|www\./i.test(s), 'must not contain a URL')
  .refine((s) => !s.includes('#'), 'must not contain a hashtag')
  .refine((s) => !/\d{1,2}:\d{2}/.test(s), 'must not contain a timestamp');

const summary = z.strictObject({ ar: summaryText, en: summaryText });

const chapter = z.strictObject({
  startSeconds: z.number().int().nonnegative(),
  /** Arabic — the video's language; shown as-is on both locales. */
  title: z.string().trim().min(1),
});

export const lessonVideoSchema = z
  .strictObject({
    youtubeId: z.string().regex(YOUTUBE_ID_PATTERN, 'must be an 11-character YouTube video ID'),
    title: localized,
    summary,
    description: localized,
    /** ISO 8601: a calendar date, or a datetime carrying an offset (as YouTube publishes it). */
    uploadDate: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
    durationSeconds: z.number().int().positive(),
    /** Optional. A single chapter is just the whole video, so require at least two. */
    chapters: z.array(chapter).min(2).optional(),
  })
  // Cross-field chapter rules. Each chapter becomes a Clip whose end is the next
  // chapter's start (or the video's end), so the list must begin at 0, strictly
  // ascend, and stay inside the video — otherwise a Clip would be empty or
  // negative-length.
  .superRefine((video, ctx) => {
    const chapters = video.chapters;
    // An empty list is already rejected by `.min(2)` above; nothing to cross-check.
    if (!chapters || chapters.length === 0) return;
    if (chapters[0].startSeconds !== 0) {
      ctx.addIssue({ code: 'custom', path: ['chapters', 0, 'startSeconds'], message: 'the first chapter must start at 0' });
    }
    chapters.forEach((c, i) => {
      if (i > 0 && c.startSeconds <= chapters[i - 1].startSeconds) {
        ctx.addIssue({
          code: 'custom',
          path: ['chapters', i, 'startSeconds'],
          message: 'chapters must be in strictly ascending order',
        });
      }
      if (c.startSeconds >= video.durationSeconds) {
        ctx.addIssue({
          code: 'custom',
          path: ['chapters', i, 'startSeconds'],
          message: 'a chapter must start before the end of the video (durationSeconds)',
        });
      }
    });
  });

/** `{ <lesson slug>: video }`. Keys are checked against real lessons in {@link parseVideos}. */
export const videosFileSchema = z.record(z.string(), lessonVideoSchema);

export type LessonVideo = z.infer<typeof lessonVideoSchema>;
export type VideoChapter = z.infer<typeof chapter>;
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
