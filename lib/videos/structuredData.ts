import { formatIsoDuration, videoEmbedUrl } from './format';
import { videoPosterSrc, type LessonVideo } from './schema';

/**
 * Structured data for a video WATCH page (feature 010). Pure functions of the
 * video record and the site origin, so the exact JSON-LD is unit-testable.
 *
 * Everything here is Arabic and points at the Arabic URLs: the videos are in
 * Arabic and /en/videos/* canonicalizes to the Arabic page (the i3rab pattern).
 * Lesson pages deliberately get no VideoObject — they are text-first, and
 * Google only indexes a video on a page where it is the main content.
 */

/** Canonical (Arabic) watch-page URL. */
export const watchUrl = (siteUrl: string, slug: string) => `${siteUrl}/videos/${slug}`;

/** Canonical (Arabic) /videos index URL. */
export const videosIndexUrl = (siteUrl: string) => `${siteUrl}/videos`;

/** Absolute URL of the self-hosted poster. */
export const posterUrl = (siteUrl: string, slug: string) => `${siteUrl}${videoPosterSrc(slug)}`;

/** `@id` of a lesson page's LearningResource: its URL plus `#lesson`. */
export const lessonResourceId = (lessonPageUrl: string) => `${lessonPageUrl}#lesson`;

/** `@id` of the Arabic lesson a video belongs to. */
export const arLessonResourceId = (siteUrl: string, slug: string) =>
  lessonResourceId(`${siteUrl}/lessons/${slug}`);

interface ClipLd {
  '@type': 'Clip';
  name: string;
  startOffset: number;
  endOffset: number;
  url: string;
}

/**
 * One Clip per chapter. A clip runs until the next chapter starts; the last one
 * runs to the end of the video. Its `url` is the watch page with `?t=<start>`,
 * which is what Google requires: same path as the video, plus a time parameter.
 */
export function buildClips(slug: string, video: LessonVideo, siteUrl: string): ClipLd[] {
  const chapters = video.chapters ?? [];
  return chapters.map((chapter, i) => ({
    '@type': 'Clip',
    name: chapter.title,
    startOffset: chapter.startSeconds,
    endOffset: i + 1 < chapters.length ? chapters[i + 1].startSeconds : video.durationSeconds,
    url: `${watchUrl(siteUrl, slug)}?t=${chapter.startSeconds}`,
  }));
}

export function buildVideoObject({ slug, video, siteUrl }: { slug: string; video: LessonVideo; siteUrl: string }) {
  const clips = buildClips(slug, video, siteUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${watchUrl(siteUrl, slug)}#video`,
    name: video.title.ar,
    description: video.summary.ar,
    thumbnailUrl: [posterUrl(siteUrl, slug)],
    uploadDate: video.uploadDate,
    duration: formatIsoDuration(video.durationSeconds),
    embedUrl: videoEmbedUrl(video.youtubeId),
    url: watchUrl(siteUrl, slug),
    inLanguage: 'ar',
    isPartOf: { '@id': arLessonResourceId(siteUrl, slug) },
    publisher: { '@id': `${siteUrl}/#organization` },
    ...(clips.length > 0 ? { hasPart: clips } : {}),
  };
}
