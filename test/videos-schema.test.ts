import { describe, it, expect } from 'vitest';
import {
  lessonVideoSchema,
  parseVideos,
  SUMMARY_MAX_LENGTH,
  videoPosterSrc,
  YOUTUBE_ID_PATTERN,
} from '@/lib/videos/schema';

// ─────────────────────────────────────────────────────────────────────────────
// content/videos.json is hand-edited and every entry becomes a third-party
// iframe on a lesson page, so the schema is strict and FATAL: a bad slug, a bad
// ID or a typo'd key must fail the build, never ship a degraded page.
// parseVideos() takes the lesson slug list as an argument, so all of that is
// testable here without touching real content.
// ─────────────────────────────────────────────────────────────────────────────

const SLUGS = ['elm_alnaho', 'aqsam_kalam'];

const valid = () => ({
  youtubeId: 'H1Ml29ytjQ0',
  title: { ar: 'علم النحو', en: 'Arabic grammar' },
  summary: { ar: 'ملخص الدرس.', en: 'Lesson summary.' },
  description: { ar: 'وصف', en: 'Description' },
  uploadDate: '2026-11-14T11:55:55-08:00',
  durationSeconds: 151,
});

const file = (overrides: Record<string, unknown> = {}, slug = 'elm_alnaho') => ({
  [slug]: { ...valid(), ...overrides },
});

describe('parseVideos — valid input', () => {
  it('returns the validated map', () => {
    expect(parseVideos(file(), SLUGS)).toEqual({ elm_alnaho: valid() });
  });

  it('accepts an empty file (no videos yet)', () => {
    expect(parseVideos({}, SLUGS)).toEqual({});
  });

  it('accepts a date-only uploadDate as well as a datetime with offset', () => {
    expect(() => parseVideos(file({ uploadDate: '2026-11-14' }), SLUGS)).not.toThrow();
    expect(() => parseVideos(file({ uploadDate: '2026-11-14T19:55:55Z' }), SLUGS)).not.toThrow();
  });

  it('accepts IDs using the full URL-safe alphabet', () => {
    expect(() => parseVideos(file({ youtubeId: 'a-B_c0d1E2f' }), SLUGS)).not.toThrow();
  });
});

describe('parseVideos — bad slug', () => {
  it('rejects a key that is not an existing lesson, naming it', () => {
    expect(() => parseVideos(file({}, 'alfeal'), SLUGS)).toThrow(/no lesson with slug "alfeal"/);
  });

  it('names every unknown slug, not just the first', () => {
    const raw = { ...file({}, 'nope_one'), ...file({}, 'nope_two'), ...file() };
    expect(() => parseVideos(raw, SLUGS)).toThrow(/"nope_one", "nope_two"/);
  });

  it('rejects a valid entry when the slug list is empty', () => {
    expect(() => parseVideos(file(), [])).toThrow(/no lesson with slug "elm_alnaho"/);
  });
});

describe('parseVideos — bad YouTube ID', () => {
  it.each([
    ['too short', 'H1Ml29ytjQ'],
    ['too long', 'H1Ml29ytjQ0x'],
    ['illegal character', 'H1Ml29ytjQ!'],
    ['a full URL', 'https://youtu.be/H1Ml29ytjQ0'],
    ['a query-string injection', 'H1Ml29ytjQ0?autoplay=1'],
    ['empty', ''],
  ])('rejects %s', (_label, youtubeId) => {
    expect(() => parseVideos(file({ youtubeId }), SLUGS)).toThrow(/youtubeId|11-character/);
  });

  it('rejects a non-string ID', () => {
    expect(() => parseVideos(file({ youtubeId: 12345678901 }), SLUGS)).toThrow(/content\/videos\.json is invalid/);
  });
});

describe('parseVideos — other invalid shapes', () => {
  it.each([
    ['a missing English title', { title: { ar: 'علم النحو' } }],
    ['a blank Arabic title', { title: { ar: '   ', en: 'x' } }],
    ['a missing description locale', { description: { en: 'x' } }],
    ['a non-ISO uploadDate', { uploadDate: '14/11/2026' }],
    ['a datetime without an offset', { uploadDate: '2026-11-14T11:55:55' }],
    ['a zero duration', { durationSeconds: 0 }],
    ['a negative duration', { durationSeconds: -5 }],
    ['a fractional duration', { durationSeconds: 151.5 }],
    ['a duration given as a string', { durationSeconds: '151' }],
    ['an unknown key (typo guard)', { youtubeID: 'H1Ml29ytjQ0' }],
    ['an unknown locale', { title: { ar: 'x', en: 'x', fr: 'x' } }],
  ])('rejects %s', (_label, overrides) => {
    expect(() => parseVideos(file(overrides), SLUGS)).toThrow(/content\/videos\.json is invalid/);
  });

  it('rejects a missing required field', () => {
    const incomplete: Record<string, unknown> = valid();
    delete incomplete.durationSeconds;
    expect(() => parseVideos({ elm_alnaho: incomplete }, SLUGS)).toThrow(/content\/videos\.json is invalid/);
  });

  it.each([
    ['an array', []],
    ['null', null],
    ['a string', 'videos'],
  ])('rejects a file that is %s', (_label, raw) => {
    expect(() => parseVideos(raw, SLUGS)).toThrow(/content\/videos\.json is invalid/);
  });
});

describe('parseVideos — summary', () => {
  const withSummary = (ar: unknown, en: unknown = 'Lesson summary.') => file({ summary: { ar, en } });

  it('accepts exactly SUMMARY_MAX_LENGTH characters', () => {
    expect(SUMMARY_MAX_LENGTH).toBe(300);
    expect(() => parseVideos(withSummary('ن'.repeat(300)), SLUGS)).not.toThrow();
  });

  it('measures length after trimming surrounding whitespace', () => {
    expect(() => parseVideos(withSummary(`  ${'ن'.repeat(300)}  `), SLUGS)).not.toThrow();
  });

  it.each([
    ['one character over the limit', 'ن'.repeat(301), /summary/],
    ['an empty string', '', /summary/],
    ['whitespace only', '   ', /summary/],
    ['an https URL', 'شاهد https://alnahwalkafi.com الآن', /must not contain a URL/],
    ['an http URL', 'see http://example.com', /must not contain a URL/],
    ['a bare www. address', 'زوروا www.example.com', /must not contain a URL/],
    ['a hashtag', 'درس مهم #النحو', /must not contain a hashtag/],
    ['a chapter timestamp', 'مقدمة 0:13 ثم التعريف', /must not contain a timestamp/],
    ['an h:mm:ss timestamp', 'at 1:02:03 we start', /must not contain a timestamp/],
    ['a line break', 'السطر الأول\nالسطر الثاني', /must be a single line/],
    ['a non-string', 42, /summary/],
  ])('rejects %s (Arabic)', (_label, value, message) => {
    expect(() => parseVideos(withSummary(value), SLUGS)).toThrow(message);
  });

  it('applies the same rules to the English summary', () => {
    expect(() => parseVideos(withSummary('ملخص.', 'Watch at https://youtu.be/x'), SLUGS)).toThrow(/must not contain a URL/);
    expect(() => parseVideos(withSummary('ملخص.', 'x'.repeat(301)), SLUGS)).toThrow(/summary/);
  });

  it('rejects a missing summary and a missing locale', () => {
    const noSummary: Record<string, unknown> = valid();
    delete noSummary.summary;
    expect(() => parseVideos({ elm_alnaho: noSummary }, SLUGS)).toThrow(/summary/);
    expect(() => parseVideos(file({ summary: { ar: 'ملخص.' } }), SLUGS)).toThrow(/summary/);
    expect(() => parseVideos(file({ summary: { ar: 'ملخص.', en: 'x', fr: 'x' } }), SLUGS)).toThrow(/summary/);
  });

  it('does not constrain the verbatim description (URLs, hashtags, timestamps allowed)', () => {
    const description = { ar: '0:00 مقدمة\nhttps://alnahwalkafi.com #النحو', en: 'Description' };
    expect(() => parseVideos(file({ description }), SLUGS)).not.toThrow();
  });
});

describe('parseVideos — chapters', () => {
  // The fixture video is 151 seconds long.
  const withChapters = (chapters: unknown) => file({ chapters });
  const ch = (startSeconds: unknown, title: unknown = 'فصل') => ({ startSeconds, title });

  it('is optional', () => {
    expect(parseVideos(file(), SLUGS).elm_alnaho.chapters).toBeUndefined();
  });

  it('accepts ascending chapters that start at 0 and end before the video does', () => {
    const chapters = [ch(0, 'مقدمة'), ch(10, 'حركةٌ تغيّر المعنى'), ch(150, 'خاتمة')];
    expect(parseVideos(withChapters(chapters), SLUGS).elm_alnaho.chapters).toEqual(chapters);
  });

  it.each([
    ['a first chapter that does not start at 0', [ch(5), ch(10)], /the first chapter must start at 0/],
    ['two chapters with the same start', [ch(0), ch(10), ch(10)], /strictly ascending/],
    ['descending starts', [ch(0), ch(40), ch(20)], /strictly ascending/],
    ['a start equal to the duration', [ch(0), ch(151)], /before the end of the video/],
    ['a start beyond the duration', [ch(0), ch(999)], /before the end of the video/],
    ['a negative start', [ch(0), ch(-1)], /chapters/],
    ['a fractional start', [ch(0), ch(10.5)], /chapters/],
    ['a start given as a "m:ss" string', [ch(0), ch('0:10')], /chapters/],
    ['an empty title', [ch(0), ch(10, '')], /chapters/],
    ['a blank title', [ch(0), ch(10, '   ')], /chapters/],
    ['a single chapter', [ch(0)], /chapters/],
    ['an empty list', [], /chapters/],
    ['an unknown chapter key', [ch(0), { startSeconds: 10, title: 'فصل', endSeconds: 20 }], /chapters/],
    ['a non-array', { 0: ch(0) }, /chapters/],
  ])('rejects %s', (_label, chapters, message) => {
    expect(() => parseVideos(withChapters(chapters), SLUGS)).toThrow(message);
  });

  it('names the slug and chapter index in the error', () => {
    expect(() => parseVideos(withChapters([ch(0), ch(40), ch(20)]), SLUGS)).toThrow(/elm_alnaho[\s\S]*chapters[\s\S]*2|chapters\[2\]/);
  });
});

describe('lessonVideoSchema / helpers', () => {
  it('parses a single valid record', () => {
    expect(lessonVideoSchema.parse(valid())).toEqual(valid());
  });

  it('YOUTUBE_ID_PATTERN is anchored at both ends', () => {
    expect(YOUTUBE_ID_PATTERN.test('H1Ml29ytjQ0')).toBe(true);
    expect(YOUTUBE_ID_PATTERN.test(' H1Ml29ytjQ0')).toBe(false);
    expect(YOUTUBE_ID_PATTERN.test('H1Ml29ytjQ0\n')).toBe(false);
  });

  it('videoPosterSrc points at the self-hosted poster', () => {
    expect(videoPosterSrc('aqsam_kalam')).toBe('/videos/aqsam_kalam.jpg');
  });
});
