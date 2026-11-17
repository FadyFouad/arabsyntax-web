/**
 * Pure builders for the video part of public/sitemap.xml (feature 010).
 *
 * No file I/O and no side effects, so both scripts/generate-seo.mjs and the
 * vitest suite can import it. generate-seo.mjs runs before `next build`, outside
 * the TypeScript toolchain, which is why this is plain .mjs and re-states two
 * tiny rules (ID pattern, embed URL) that also live in lib/videos/.
 */

// Keep in sync with lib/videos/schema.ts and lib/lessons/loader.ts. Full
// validation is the loader's job (bad data fails `next build`); these only stop
// a value that would be unsafe to interpolate into a URL.
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const SLUG_PATTERN = /^[a-z0-9_-]+$/;

/**
 * Escape text for an XML text node or attribute value.
 *
 * @param {unknown} s
 */
export const xmlEscape = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Videos that get a watch page, in curriculum (lesson manifest) order — the
 * same order as getVideoIndex() in lib/videos/loader.ts.
 *
 * @param {Record<string, any>} videos
 * @param {string[]} lessonSlugs
 * @returns {{ slug: string, video: any }[]}
 */
export function orderedVideoEntries(videos, lessonSlugs) {
  return lessonSlugs
    .filter((slug) => Object.hasOwn(videos, slug))
    .map((slug) => {
      const video = videos[slug];
      if (!SLUG_PATTERN.test(slug) || !YOUTUBE_ID_PATTERN.test(String(video?.youtubeId))) {
        throw new Error(`generate-seo: content/videos.json entry "${slug}" has an invalid slug or youtubeId`);
      }
      return { slug, video };
    });
}

/**
 * The `<video:video>` block for one watch page. Arabic text: the page is Arabic-canonical.
 *
 * @param {{ site: string, slug?: string, video: any }} entry
 */
export function videoSitemapTag({ site, slug, video }) {
  return [
    '    <video:video>',
    `      <video:thumbnail_loc>${xmlEscape(`${site}/videos/${slug}.jpg`)}</video:thumbnail_loc>`,
    `      <video:title>${xmlEscape(video.title.ar)}</video:title>`,
    `      <video:description>${xmlEscape(video.summary.ar)}</video:description>`,
    `      <video:player_loc>${xmlEscape(`https://www.youtube-nocookie.com/embed/${video.youtubeId}`)}</video:player_loc>`,
    `      <video:duration>${Number(video.durationSeconds)}</video:duration>`,
    `      <video:publication_date>${xmlEscape(video.uploadDate)}</video:publication_date>`,
    '    </video:video>',
  ].join('\n');
}

/**
 * A complete `<url>` for an Arabic-only video route (/videos or a watch page):
 * the Arabic URL alone, `ar` + `x-default` alternates and no `en` — matching
 * the canonical/hreflang the pages emit. `video` adds the `<video:video>` block.
 *
 * @param {{ site: string, route: string, priority: string, slug?: string, video?: any }} entry
 */
export function videoUrlEntry({ site, route, priority, slug, video }) {
  const loc = `${site}${route}`;
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    '    <changefreq>monthly</changefreq>',
    `    <priority>${priority}</priority>`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${xmlEscape(loc)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(loc)}"/>`,
    ...(video ? [videoSitemapTag({ site, slug, video })] : []),
    '  </url>',
  ].join('\n');
}

/**
 * Every video `<url>`: the /videos index first, then one watch page per video.
 *
 * @param {{ site: string, videos: Record<string, any>, lessonSlugs: string[] }} input
 * @returns {string[]}
 */
export function videoSitemapEntries({ site, videos, lessonSlugs }) {
  const entries = orderedVideoEntries(videos, lessonSlugs);
  if (entries.length === 0) return [];
  return [
    videoUrlEntry({ site, route: '/videos', priority: '0.6' }),
    ...entries.map(({ slug, video }) =>
      videoUrlEntry({ site, route: `/videos/${slug}`, priority: '0.7', slug, video }),
    ),
  ];
}
