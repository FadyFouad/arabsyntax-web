import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { getChannel } = await import('@/lib/channel/loader');
const { CHANNEL_URL_PATTERN, TRAILER_POSTER_SLUG } = await import('@/lib/channel/schema');
const { videoPosterSrc, YOUTUBE_ID_PATTERN } = await import('@/lib/videos/schema');
const { getAllLessonVideos } = await import('@/lib/videos/loader');
const { getAllSlugs } = await import('@/lib/lessons/loader');

// The loader against the REAL content/channel.json — doubles as the content-
// integrity guard for the file. (Injected failures: channel-loader-errors.)
describe('channel loader (real content)', () => {
  it('loads and validates content/channel.json', () => {
    const channel = getChannel();
    expect(channel.channelUrl).toMatch(CHANNEL_URL_PATTERN);
    expect(channel.trailer.youtubeId).toMatch(YOUTUBE_ID_PATTERN);
    expect(channel.trailer.title.ar).toBeTruthy();
    expect(channel.trailer.title.en).toBeTruthy();
    expect(channel.trailer.durationSeconds).toBeGreaterThan(0);
  });

  it('memoizes: repeated calls return the same object', () => {
    expect(getChannel()).toBe(getChannel());
  });

  it('the trailer is not a lesson video, and its poster name collides with nothing', () => {
    const videos = getAllLessonVideos();
    expect(Object.values(videos).map((v) => v.youtubeId)).not.toContain(getChannel().trailer.youtubeId);
    expect(Object.keys(videos)).not.toContain(TRAILER_POSTER_SLUG);
    expect(getAllSlugs()).not.toContain(TRAILER_POSTER_SLUG);
  });

  // The homepage renders /videos/trailer.jpg unconditionally.
  it('the trailer has its self-hosted poster on disk', () => {
    const file = path.join(process.cwd(), 'public', videoPosterSrc(TRAILER_POSTER_SLUG));
    expect(existsSync(file), `missing ${file} — run \`npm run videos:posters\``).toBe(true);
  });
});
