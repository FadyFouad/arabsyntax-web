import { describe, it, expect } from 'vitest';
import { lessonVideoSchema, parseVideos, videoPosterSrc, YOUTUBE_ID_PATTERN } from '@/lib/videos/schema';

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
