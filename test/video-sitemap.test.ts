import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  orderedVideoEntries,
  videoSitemapEntries,
  videoSitemapTag,
  videoUrlEntry,
  xmlEscape,
} from '../scripts/seo/video-sitemap.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Video sitemap entries (feature 010). scripts/generate-seo.mjs runs before
// `next build`, outside the TS toolchain; its video part lives in a pure .mjs
// module so the exact XML can be pinned here.
// ─────────────────────────────────────────────────────────────────────────────

const SITE = 'https://alnahwalkafi.com';

const video = (overrides: Record<string, unknown> = {}) => ({
  youtubeId: 'HsAQqiWgIhg',
  title: { ar: 'ما هو الكلام؟', en: 'What Is Speech?' },
  summary: { ar: 'ملخص عربي.', en: 'English summary.' },
  description: { ar: 'الوصف الكامل', en: 'Full description' },
  uploadDate: '2026-11-15T11:37:45-08:00',
  durationSeconds: 241,
  ...overrides,
});

describe('xmlEscape', () => {
  it('escapes all five XML special characters', () => {
    expect(xmlEscape(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &apos; f');
  });

  it('escapes & first, so entities are not double-escaped into nonsense', () => {
    expect(xmlEscape('<&>')).toBe('&lt;&amp;&gt;');
  });

  it('leaves Arabic text untouched and stringifies non-strings', () => {
    expect(xmlEscape('علامات الاسم')).toBe('علامات الاسم');
    expect(xmlEscape(241)).toBe('241');
  });
});

describe('videoSitemapTag', () => {
  const tag = videoSitemapTag({ site: SITE, slug: 'aqsam_kalam', video: video() });

  it('emits the Google video tags, in schema order, with Arabic text', () => {
    expect(tag.split('\n').map((line) => line.trim())).toEqual([
      '<video:video>',
      '<video:thumbnail_loc>https://alnahwalkafi.com/videos/aqsam_kalam.jpg</video:thumbnail_loc>',
      '<video:title>ما هو الكلام؟</video:title>',
      '<video:description>ملخص عربي.</video:description>',
      '<video:player_loc>https://www.youtube-nocookie.com/embed/HsAQqiWgIhg</video:player_loc>',
      '<video:duration>241</video:duration>',
      '<video:publication_date>2026-11-15T11:37:45-08:00</video:publication_date>',
      '</video:video>',
    ]);
  });

  it('describes the video with the summary, not the verbatim description', () => {
    expect(tag).not.toContain('الوصف الكامل');
    expect(tag).not.toContain('English summary.');
  });

  it('XML-escapes title and description', () => {
    const escaped = videoSitemapTag({
      site: SITE,
      slug: 'aqsam_kalam',
      video: video({
        title: { ar: `الاسم & الفعل <"حرف"> 'أل'`, en: 'x' },
        summary: { ar: 'شرح <b>مهم</b> & مفيد', en: 'x' },
      }),
    });
    expect(escaped).toContain('<video:title>الاسم &amp; الفعل &lt;&quot;حرف&quot;&gt; &apos;أل&apos;</video:title>');
    expect(escaped).toContain('<video:description>شرح &lt;b&gt;مهم&lt;/b&gt; &amp; مفيد</video:description>');
    // Nothing but the tags themselves opens an element.
    expect(escaped.replace(/<\/?video:[a-z_]+>/g, '')).not.toMatch(/[<>]/);
  });
});

describe('videoUrlEntry', () => {
  it('lists the Arabic URL alone: ar + x-default alternates, no en', () => {
    const entry = videoUrlEntry({ site: SITE, route: '/videos/aqsam_kalam', priority: '0.7', slug: 'aqsam_kalam', video: video() });
    expect(entry).toContain('<loc>https://alnahwalkafi.com/videos/aqsam_kalam</loc>');
    expect(entry).toContain('hreflang="ar" href="https://alnahwalkafi.com/videos/aqsam_kalam"');
    expect(entry).toContain('hreflang="x-default" href="https://alnahwalkafi.com/videos/aqsam_kalam"');
    expect(entry).not.toContain('hreflang="en"');
    expect(entry).not.toContain('/en/');
    expect(entry).toContain('<priority>0.7</priority>');
    expect(entry.match(/<video:video>/g)).toHaveLength(1);
  });

  it('omits the video block for the index route', () => {
    const entry = videoUrlEntry({ site: SITE, route: '/videos', priority: '0.6' });
    expect(entry).toContain('<loc>https://alnahwalkafi.com/videos</loc>');
    expect(entry).not.toContain('video:video');
  });
});

describe('orderedVideoEntries / videoSitemapEntries', () => {
  const videos = { horof_gar: video({ youtubeId: '3jPaRjMrf8I' }), alesm: video({ youtubeId: 'I2gepg1axps' }) };
  const manifest = ['alesm', 'alhaal', 'horof_gar'];

  it('follows lesson-manifest order, not videos.json key order', () => {
    expect(orderedVideoEntries(videos, manifest).map((e) => e.slug)).toEqual(['alesm', 'horof_gar']);
  });

  it('emits the index first, then one watch page per video', () => {
    const entries = videoSitemapEntries({ site: SITE, videos, lessonSlugs: manifest });
    const locs = entries.map((e) => e.match(/<loc>(.*?)<\/loc>/)?.[1]);
    expect(locs).toEqual([`${SITE}/videos`, `${SITE}/videos/alesm`, `${SITE}/videos/horof_gar`]);
  });

  it('emits nothing — not even the index — when there are no videos', () => {
    expect(videoSitemapEntries({ site: SITE, videos: {}, lessonSlugs: manifest })).toEqual([]);
  });

  it('ignores inherited keys and videos whose slug is not a lesson', () => {
    expect(orderedVideoEntries(videos, ['constructor', 'toString'])).toEqual([]);
    expect(orderedVideoEntries({ orphan: video() }, manifest)).toEqual([]);
  });

  it('refuses an ID that would be unsafe to interpolate into a URL', () => {
    expect(() => orderedVideoEntries({ alesm: video({ youtubeId: 'x"/><evil' }) }, manifest)).toThrow(/invalid slug or youtubeId/);
    expect(() => orderedVideoEntries({ alesm: {} }, manifest)).toThrow(/invalid slug or youtubeId/);
  });
});

// End to end: run the real generator against the real content and inspect the
// file `next build` will ship.
describe('generated public/sitemap.xml', () => {
  const root = process.cwd();
  execFileSync(process.execPath, ['scripts/generate-seo.mjs'], {
    cwd: root,
    env: { ...process.env, NEXT_PUBLIC_SITE_URL: SITE },
    stdio: 'pipe',
  });
  const sitemap = readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
  const videos = JSON.parse(readFileSync(path.join(root, 'content', 'videos.json'), 'utf8')) as Record<
    string,
    { youtubeId: string; durationSeconds: number }
  >;
  const manifest = Object.keys(
    JSON.parse(readFileSync(path.join(root, 'content', 'lessons', 'manifest.json'), 'utf8')).en,
  );

  it('declares the video namespace', () => {
    expect(sitemap).toContain('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"');
  });

  it('lists /videos and every watch page exactly once, in manifest order', () => {
    const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs.filter((loc) => loc === `${SITE}/videos`)).toHaveLength(1);
    const watch = locs.filter((loc) => loc.startsWith(`${SITE}/videos/`));
    expect(watch).toEqual(manifest.filter((slug) => slug in videos).map((slug) => `${SITE}/videos/${slug}`));
    expect(locs.some((loc) => loc.includes('/en/videos'))).toBe(false);
  });

  it('has one video block per video with its player, thumbnail and duration', () => {
    expect(sitemap.match(/<video:video>/g)).toHaveLength(Object.keys(videos).length);
    for (const [slug, v] of Object.entries(videos)) {
      expect(sitemap).toContain(`<video:thumbnail_loc>${SITE}/videos/${slug}.jpg</video:thumbnail_loc>`);
      expect(sitemap).toContain(`<video:player_loc>https://www.youtube-nocookie.com/embed/${v.youtubeId}</video:player_loc>`);
      expect(sitemap).toContain(`<video:duration>${v.durationSeconds}</video:duration>`);
    }
  });

  it('is well-formed: paired elements balance and no raw & survives', () => {
    for (const tag of ['url', 'loc', 'video:video', 'video:title', 'video:description']) {
      const opened = sitemap.split(`<${tag}>`).length - 1;
      const closed = sitemap.split(`</${tag}>`).length - 1;
      expect(opened, `<${tag}>`).toBe(closed);
    }
    expect(sitemap).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
  });
});
