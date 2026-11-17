import { describe, it, expect, vi } from 'vitest';
import {
  curriculumOrder,
  displayTitleAr,
  formatClock,
  formatIsoDuration,
  parseStartParam,
  videoEmbedUrl,
} from '@/lib/videos/format';
import {
  arLessonResourceId,
  buildClips,
  buildVideoObject,
  lessonResourceId,
  posterUrl,
  videosIndexUrl,
  watchUrl,
} from '@/lib/videos/structuredData';
import type { LessonVideo } from '@/lib/videos/schema';
import { serializeJsonLd } from '@/lib/jsonLd';

// ─────────────────────────────────────────────────────────────────────────────
// Watch-page structured data (feature 010). The VideoObject is what makes a
// lesson video eligible for video results, so its exact shape is pinned here as
// a pure function of the record — no page render needed.
// ─────────────────────────────────────────────────────────────────────────────

// The last block loads the real content through the server-only loader.
vi.mock('server-only', () => ({}));

const SITE = 'https://alnahwalkafi.com';

const video = (overrides: Partial<LessonVideo> = {}): LessonVideo => ({
  youtubeId: 'HsAQqiWgIhg',
  title: { ar: 'ما هو الكلام عند النحاة؟', en: 'What Is Speech?' },
  summary: { ar: 'ملخص عربي.', en: 'English summary.' },
  description: { ar: 'الوصف الكامل https://example.com #وسم', en: 'Full description' },
  uploadDate: '2026-11-15T11:37:45-08:00',
  durationSeconds: 241,
  chapters: [
    { startSeconds: 0, title: 'مقدمة' },
    { startSeconds: 13, title: 'ما هو الكلام؟' },
    { startSeconds: 182, title: 'تطبيق' },
  ],
  ...overrides,
});

describe('formatIsoDuration', () => {
  it.each([
    [241, 'PT4M1S'],
    [45, 'PT45S'],
    [60, 'PT1M'],
    [300, 'PT5M'],
    [151, 'PT2M31S'],
    [3600, 'PT1H'],
    [3605, 'PT1H5S'],
    [3723, 'PT1H2M3S'],
    [1, 'PT1S'],
  ])('%i seconds → %s', (seconds, expected) => {
    expect(formatIsoDuration(seconds)).toBe(expected);
  });

  it.each([0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (bad) => {
    expect(() => formatIsoDuration(bad)).toThrow(RangeError);
  });
});

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [13, '0:13'],
    [77, '1:17'],
    [241, '4:01'],
    [600, '10:00'],
    [3723, '1:02:03'],
    [-4, '0:00'],
    [77.9, '1:17'],
  ])('%s seconds → %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});

describe('parseStartParam', () => {
  it('reads a whole number of seconds inside the video', () => {
    expect(parseStartParam('?t=77', 241)).toBe(77);
    expect(parseStartParam('?utm_source=x&t=240', 241)).toBe(240);
  });

  it.each([
    ['no query', ''],
    ['no t param', '?x=1'],
    ['t=0 (the beginning is not an offset)', '?t=0'],
    ['the duration itself', '?t=241'],
    ['beyond the duration', '?t=9999'],
    ['negative', '?t=-5'],
    ['fractional', '?t=1.5'],
    ['a m:ss string', '?t=1:17'],
    ['a YouTube-style suffix', '?t=77s'],
    ['empty', '?t='],
    ['an injection attempt', '?t=77%26autoplay%3D1'],
    ['too many digits', '?t=1000000'],
  ])('returns null for %s', (_label, search) => {
    expect(parseStartParam(search, 241)).toBeNull();
  });
});

describe('displayTitleAr', () => {
  it('removes the trailing channel suffix', () => {
    expect(displayTitleAr('أقسام الفعل | النحو الكافي')).toBe('أقسام الفعل');
    expect(displayTitleAr('علامات الاسم: كيف تعرف أن الكلمة اسم؟ | النحو الكافي')).toBe(
      'علامات الاسم: كيف تعرف أن الكلمة اسم؟',
    );
    expect(displayTitleAr('أقسام الفعل|النحو الكافي  ')).toBe('أقسام الفعل');
  });

  it('keeps any other "|" segment, such as the lesson number', () => {
    expect(displayTitleAr('علم النحو: ما هو؟ وكيف بدأ؟ | الدرس الأول')).toBe('علم النحو: ما هو؟ وكيف بدأ؟ | الدرس الأول');
    expect(displayTitleAr('علم النحو | الدرس الأول | النحو الكافي')).toBe('علم النحو | الدرس الأول');
  });

  it('only strips the suffix at the very end, and only as a separate segment', () => {
    expect(displayTitleAr('النحو الكافي | مقدمة')).toBe('النحو الكافي | مقدمة');
    expect(displayTitleAr('تطبيق النحو الكافي')).toBe('تطبيق النحو الكافي');
    expect(displayTitleAr('أقسام الفعل')).toBe('أقسام الفعل');
  });
});

describe('curriculumOrder', () => {
  const manifest = ['alesm', 'alhaal', 'aqsam_kalam', 'elm_alnaho', 'horof_gar'];
  const tree = ['elm_alnaho', 'aqsam_kalam', 'alesm', 'horof_gar'];

  it('follows the lesson tree, not the manifest or the input order', () => {
    expect(curriculumOrder(['horof_gar', 'alesm', 'elm_alnaho'], tree, manifest)).toEqual([
      'elm_alnaho',
      'alesm',
      'horof_gar',
    ]);
  });

  it('appends a video whose lesson is not in the tree, in manifest order', () => {
    expect(curriculumOrder(['alhaal', 'elm_alnaho'], tree, manifest)).toEqual(['elm_alnaho', 'alhaal']);
    expect(curriculumOrder(['horof_gar', 'alesm'], [], manifest)).toEqual(['alesm', 'horof_gar']);
  });

  it('never drops or duplicates a slug', () => {
    expect(curriculumOrder(['orphan', 'alesm'], ['alesm', 'alesm'], ['alesm'])).toEqual(['alesm', 'orphan']);
    expect(curriculumOrder([], tree, manifest)).toEqual([]);
  });
});

describe('URL helpers', () => {
  it('build absolute, Arabic-canonical URLs', () => {
    expect(watchUrl(SITE, 'aqsam_kalam')).toBe('https://alnahwalkafi.com/videos/aqsam_kalam');
    expect(videosIndexUrl(SITE)).toBe('https://alnahwalkafi.com/videos');
    expect(posterUrl(SITE, 'aqsam_kalam')).toBe('https://alnahwalkafi.com/videos/aqsam_kalam.jpg');
    expect(videoEmbedUrl('HsAQqiWgIhg')).toBe('https://www.youtube-nocookie.com/embed/HsAQqiWgIhg');
  });

  it('the lesson @id is the lesson URL plus #lesson, and the video points at the Arabic one', () => {
    expect(lessonResourceId('https://alnahwalkafi.com/en/lessons/alesm')).toBe(
      'https://alnahwalkafi.com/en/lessons/alesm#lesson',
    );
    expect(arLessonResourceId(SITE, 'alesm')).toBe(lessonResourceId(`${SITE}/lessons/alesm`));
  });
});

describe('buildClips', () => {
  it('ends each clip where the next begins, and the last at the video duration', () => {
    expect(buildClips('aqsam_kalam', video(), SITE)).toEqual([
      { '@type': 'Clip', name: 'مقدمة', startOffset: 0, endOffset: 13, url: `${SITE}/videos/aqsam_kalam?t=0` },
      { '@type': 'Clip', name: 'ما هو الكلام؟', startOffset: 13, endOffset: 182, url: `${SITE}/videos/aqsam_kalam?t=13` },
      { '@type': 'Clip', name: 'تطبيق', startOffset: 182, endOffset: 241, url: `${SITE}/videos/aqsam_kalam?t=182` },
    ]);
  });

  it('every clip has positive length and stays on the watch-page path', () => {
    for (const clip of buildClips('aqsam_kalam', video(), SITE)) {
      expect(clip.endOffset).toBeGreaterThan(clip.startOffset);
      expect(clip.url.split('?')[0]).toBe(watchUrl(SITE, 'aqsam_kalam'));
    }
  });

  it('is empty without chapters', () => {
    expect(buildClips('aqsam_kalam', video({ chapters: undefined }), SITE)).toEqual([]);
  });
});

describe('buildVideoObject', () => {
  const ld = buildVideoObject({ slug: 'aqsam_kalam', video: video(), siteUrl: SITE });

  it('carries every field Google requires or recommends for a video result', () => {
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      '@id': 'https://alnahwalkafi.com/videos/aqsam_kalam#video',
      name: 'ما هو الكلام عند النحاة؟',
      description: 'ملخص عربي.',
      thumbnailUrl: ['https://alnahwalkafi.com/videos/aqsam_kalam.jpg'],
      uploadDate: '2026-11-15T11:37:45-08:00',
      duration: 'PT4M1S',
      embedUrl: 'https://www.youtube-nocookie.com/embed/HsAQqiWgIhg',
      url: 'https://alnahwalkafi.com/videos/aqsam_kalam',
      inLanguage: 'ar',
    });
  });

  it('names the video without the channel suffix, keeping other "|" segments', () => {
    const suffixed = video({ title: { ar: 'أقسام الفعل | النحو الكافي', en: 'x' } });
    expect(buildVideoObject({ slug: 'aqsam_alfeal', video: suffixed, siteUrl: SITE }).name).toBe('أقسام الفعل');
    const numbered = video({ title: { ar: 'علم النحو | الدرس الأول', en: 'x' } });
    expect(buildVideoObject({ slug: 'elm_alnaho', video: numbered, siteUrl: SITE }).name).toBe('علم النحو | الدرس الأول');
  });

  it('uses the summary, never the verbatim YouTube description', () => {
    expect(JSON.stringify(ld)).not.toContain('example.com');
    expect(JSON.stringify(ld)).not.toContain('الوصف الكامل');
  });

  it('is Arabic regardless of locale: English title/summary never appear', () => {
    expect(JSON.stringify(ld)).not.toContain('What Is Speech?');
    expect(JSON.stringify(ld)).not.toContain('English summary.');
  });

  it("links to the Arabic lesson's LearningResource and the site organization by @id", () => {
    expect(ld.isPartOf).toEqual({ '@id': 'https://alnahwalkafi.com/lessons/aqsam_kalam#lesson' });
    expect(ld.publisher).toEqual({ '@id': 'https://alnahwalkafi.com/#organization' });
  });

  it('has one Clip per chapter under hasPart', () => {
    expect(ld.hasPart).toEqual(buildClips('aqsam_kalam', video(), SITE));
  });

  it('omits hasPart entirely when the video has no chapters', () => {
    const plain = buildVideoObject({ slug: 'aqsam_kalam', video: video({ chapters: undefined }), siteUrl: SITE });
    expect('hasPart' in plain).toBe(false);
  });

  it('every URL is absolute and no <script>-breaking "<" survives serialization', () => {
    const tricky = buildVideoObject({
      slug: 'aqsam_kalam',
      video: video({ title: { ar: 'عنوان </script><b>', en: 'x' } }),
      siteUrl: SITE,
    });
    const serialized = serializeJsonLd(tricky);
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized).name).toBe('عنوان </script><b>');
    for (const url of [ld['@id'], ld.url, ld.embedUrl, ...ld.thumbnailUrl]) expect(url).toMatch(/^https:\/\//);
  });
});

// The same builder over the REAL content: every shipped video yields complete,
// internally consistent structured data.
describe('buildVideoObject over content/videos.json', async () => {
  const { getVideoIndex } = await import('@/lib/videos/loader');

  it('produces a complete VideoObject for every video', () => {
    const index = getVideoIndex();
    expect(index.length).toBeGreaterThan(0);
    for (const { slug, video: real } of index) {
      const object = buildVideoObject({ slug, video: real, siteUrl: SITE });
      expect(object.name, slug).toBe(displayTitleAr(real.title.ar));
      expect(object.name, slug).not.toMatch(/النحو الكافي\s*$/);
      expect(object.description, slug).toBe(real.summary.ar);
      expect(object.duration, slug).toMatch(/^PT(\d+H)?(\d+M)?(\d+S)?$/);
      expect(object.embedUrl, slug).toBe(`https://www.youtube-nocookie.com/embed/${real.youtubeId}`);
      expect(object.hasPart?.length ?? 0, slug).toBe(real.chapters?.length ?? 0);
      expect(object.hasPart?.at(-1)?.endOffset ?? real.durationSeconds, slug).toBe(real.durationSeconds);
      expect(() => JSON.parse(serializeJsonLd(object))).not.toThrow();
    }
  });
});
