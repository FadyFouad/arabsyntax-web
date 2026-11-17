import { z } from 'zod';
import { RESERVED_VIDEO_SLUG, YOUTUBE_ID_PATTERN } from '@/lib/videos/schema';

/**
 * The site's YouTube channel and its trailer (feature 011): `content/channel.json`.
 *
 * The trailer is kept apart from `content/videos.json` on purpose. That file is
 * keyed by lesson slug and every entry gets a watch page, a sitemap entry and
 * VideoObject structured data; the trailer is not a lesson and should get none
 * of them. It only appears on the homepage, behind the click-to-load facade.
 *
 * Strict and fatal, like the videos schema: the channel URL is rendered as an
 * outbound link and emitted as structured-data `sameAs`, and the ID becomes an
 * iframe URL, so a typo must fail the build.
 */

/**
 * A YouTube channel's canonical address — `/@handle` or `/channel/<id>` — with
 * no query, fragment or trailing slash, so `?sub_confirmation=1` can be
 * appended as-is and nothing but youtube.com can ever be linked.
 */
export const CHANNEL_URL_PATTERN = /^https:\/\/www\.youtube\.com\/(@[A-Za-z0-9._-]{3,30}|channel\/UC[A-Za-z0-9_-]{22})$/;

/** Poster filename (without extension) reserved for the trailer in public/videos/. */
export const TRAILER_POSTER_SLUG = RESERVED_VIDEO_SLUG;

const localized = z.strictObject({
  ar: z.string().trim().min(1),
  en: z.string().trim().min(1),
});

export const trailerSchema = z.strictObject({
  youtubeId: z.string().regex(YOUTUBE_ID_PATTERN, 'must be an 11-character YouTube video ID'),
  title: localized,
  /** ISO 8601: a calendar date, or a datetime carrying an offset (as YouTube publishes it). */
  uploadDate: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
  durationSeconds: z.number().int().positive(),
});

export const channelSchema = z.strictObject({
  channelUrl: z
    .string()
    .regex(CHANNEL_URL_PATTERN, 'must be https://www.youtube.com/@handle or https://www.youtube.com/channel/<id>'),
  trailer: trailerSchema,
});

export type Channel = z.infer<typeof channelSchema>;
export type ChannelTrailer = z.infer<typeof trailerSchema>;

/** Validate the raw contents of `content/channel.json`; throws with the offending field named. */
export function parseChannel(raw: unknown): Channel {
  const result = channelSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`content/channel.json is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Channel link that opens YouTube's "subscribe?" confirmation. */
export function subscribeUrl(channelUrl: string): string {
  return `${channelUrl}?sub_confirmation=1`;
}
