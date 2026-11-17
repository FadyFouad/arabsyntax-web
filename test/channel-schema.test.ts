import { describe, it, expect } from 'vitest';
import { CHANNEL_URL_PATTERN, parseChannel, subscribeUrl, TRAILER_POSTER_SLUG } from '@/lib/channel/schema';
import { parseVideos, RESERVED_VIDEO_SLUG } from '@/lib/videos/schema';

// ─────────────────────────────────────────────────────────────────────────────
// content/channel.json (feature 011): the YouTube channel and its trailer. The
// channel URL is rendered as an outbound link and emitted as structured-data
// `sameAs`, and the trailer ID becomes an iframe URL — so the schema is strict
// and fatal, like the videos schema.
// ─────────────────────────────────────────────────────────────────────────────

const valid = () => ({
  channelUrl: 'https://www.youtube.com/@alnahwalkafi',
  trailer: {
    youtubeId: '2eDsj0cbCcU',
    title: { ar: 'حركةٌ واحدة تغيّر المعنى | النحو الكافي', en: 'One Vowel Mark Changes the Meaning' },
    uploadDate: '2026-11-17T02:19:40-08:00',
    durationSeconds: 48,
  },
});

const withTrailer = (overrides: Record<string, unknown>) => ({
  ...valid(),
  trailer: { ...valid().trailer, ...overrides },
});

describe('parseChannel — valid input', () => {
  it('returns the validated record', () => {
    expect(parseChannel(valid())).toEqual(valid());
  });

  it('accepts a /channel/<id> URL as well as an @handle', () => {
    const channelUrl = 'https://www.youtube.com/channel/UCvVmFlGAQyKcgnu8ttfAiTA';
    expect(parseChannel({ ...valid(), channelUrl }).channelUrl).toBe(channelUrl);
  });

  it('accepts a date-only uploadDate', () => {
    expect(() => parseChannel(withTrailer({ uploadDate: '2026-11-17' }))).not.toThrow();
  });
});

describe('parseChannel — bad channelUrl', () => {
  it.each([
    ['plain http', 'http://www.youtube.com/@alnahwalkafi'],
    ['no www', 'https://youtube.com/@alnahwalkafi'],
    ['another host', 'https://example.com/@alnahwalkafi'],
    ['a look-alike host', 'https://www.youtube.com.evil.example/@alnahwalkafi'],
    ['a youtu.be link', 'https://youtu.be/2eDsj0cbCcU'],
    ['a watch URL', 'https://www.youtube.com/watch?v=2eDsj0cbCcU'],
    ['a query string', 'https://www.youtube.com/@alnahwalkafi?sub_confirmation=1'],
    ['a fragment', 'https://www.youtube.com/@alnahwalkafi#x'],
    ['a trailing slash', 'https://www.youtube.com/@alnahwalkafi/'],
    ['a sub-path', 'https://www.youtube.com/@alnahwalkafi/videos'],
    ['a handle without @', 'https://www.youtube.com/alnahwalkafi'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a trailing newline', 'https://www.youtube.com/@alnahwalkafi\n'],
    ['empty', ''],
  ])('rejects %s', (_label, channelUrl) => {
    expect(() => parseChannel({ ...valid(), channelUrl })).toThrow(/channelUrl|youtube\.com/);
  });

  it('rejects a missing or non-string channelUrl', () => {
    const { channelUrl: _omitted, ...rest } = valid();
    void _omitted;
    expect(() => parseChannel(rest)).toThrow(/content\/channel\.json is invalid/);
    expect(() => parseChannel({ ...valid(), channelUrl: 42 })).toThrow(/content\/channel\.json is invalid/);
  });
});

describe('parseChannel — bad trailer', () => {
  it.each([
    ['an ID that is too short', { youtubeId: '2eDsj0cbCc' }],
    ['an ID that is too long', { youtubeId: '2eDsj0cbCcUx' }],
    ['an ID with an illegal character', { youtubeId: '2eDsj0cbCc!' }],
    ['a full URL as the ID', { youtubeId: 'https://youtu.be/2eDsj0cbCcU' }],
    ['a missing English title', { title: { ar: 'عنوان' } }],
    ['a blank Arabic title', { title: { ar: '  ', en: 'x' } }],
    ['an unknown title locale', { title: { ar: 'x', en: 'x', fr: 'x' } }],
    ['a non-ISO uploadDate', { uploadDate: '17/11/2026' }],
    ['a datetime without an offset', { uploadDate: '2026-11-17T02:19:40' }],
    ['a zero duration', { durationSeconds: 0 }],
    ['a negative duration', { durationSeconds: -48 }],
    ['a fractional duration', { durationSeconds: 48.5 }],
    ['a duration given as a string', { durationSeconds: '48' }],
    ['an unknown key (typo guard)', { youtubeID: '2eDsj0cbCcU' }],
  ])('rejects %s', (_label, overrides) => {
    expect(() => parseChannel(withTrailer(overrides))).toThrow(/content\/channel\.json is invalid/);
  });

  it('names the offending field', () => {
    expect(() => parseChannel(withTrailer({ youtubeId: 'bad' }))).toThrow(/11-character YouTube video ID/);
    expect(() => parseChannel(withTrailer({ youtubeId: 'bad' }))).toThrow(/trailer\.youtubeId/);
  });

  it('rejects a missing trailer, an unknown top-level key, and non-objects', () => {
    expect(() => parseChannel({ channelUrl: valid().channelUrl })).toThrow(/content\/channel\.json is invalid/);
    expect(() => parseChannel({ ...valid(), shorts: [] })).toThrow(/content\/channel\.json is invalid/);
    for (const raw of [null, [], 'channel', 7]) {
      expect(() => parseChannel(raw)).toThrow(/content\/channel\.json is invalid/);
    }
  });
});

describe('helpers', () => {
  it('subscribeUrl appends the subscribe confirmation to the channel URL', () => {
    expect(subscribeUrl('https://www.youtube.com/@alnahwalkafi')).toBe(
      'https://www.youtube.com/@alnahwalkafi?sub_confirmation=1',
    );
  });

  it('CHANNEL_URL_PATTERN is anchored at both ends', () => {
    expect(CHANNEL_URL_PATTERN.test('https://www.youtube.com/@alnahwalkafi')).toBe(true);
    expect(CHANNEL_URL_PATTERN.test(' https://www.youtube.com/@alnahwalkafi')).toBe(false);
    expect(CHANNEL_URL_PATTERN.test('x https://www.youtube.com/@alnahwalkafi')).toBe(false);
  });
});

// The trailer's poster is public/videos/trailer.jpg, in the same directory (and
// /videos/<slug> URL space) as lesson videos — so that name is off limits there.
describe('reserved "trailer" slug', () => {
  const video = {
    youtubeId: 'H1Ml29ytjQ0',
    title: { ar: 'عنوان', en: 'Title' },
    summary: { ar: 'ملخص.', en: 'Summary.' },
    description: { ar: 'وصف', en: 'Description' },
    uploadDate: '2026-11-14',
    durationSeconds: 151,
  };

  it('is the trailer poster name', () => {
    expect(TRAILER_POSTER_SLUG).toBe('trailer');
    expect(RESERVED_VIDEO_SLUG).toBe(TRAILER_POSTER_SLUG);
  });

  it('videos.json may not use it, even if a lesson with that slug existed', () => {
    expect(() => parseVideos({ trailer: video }, ['trailer', 'elm_alnaho'])).toThrow(/"trailer" is reserved for the channel trailer/);
    expect(() => parseVideos({ trailer: video }, ['elm_alnaho'])).toThrow(/reserved/);
  });

  it('other keys are unaffected', () => {
    expect(() => parseVideos({ elm_alnaho: video }, ['elm_alnaho'])).not.toThrow();
  });
});
