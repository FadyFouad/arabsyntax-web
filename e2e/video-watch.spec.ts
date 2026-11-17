import { test, expect, type Page } from '@playwright/test';
import videos from '../content/videos.json';
import tree from '../content/lessons/tree.json';
import { displayTitleAr } from '../lib/videos/format';

// Video watch pages (feature 010): /videos and /videos/<slug>. Unlike the
// lesson-page facade (e2e/lesson-video.spec.ts), the watch page renders the
// YouTube iframe directly — the video is the page's main content and the page
// carries the VideoObject structured data.
//
// URLs in JSON-LD/canonical are built from NEXT_PUBLIC_SITE_URL, which differs
// between local and CI builds, so assertions compare pathnames, not origins.
// Runs under the default Arabic locale (playwright.config `locale: 'ar'`).

const SLUG = 'aqsam_kalam';
const video = videos[SLUG];
const chapters = video.chapters;
const EMBED = `https://www.youtube-nocookie.com/embed/${video.youtubeId}`;
const WITHOUT_VIDEO = 'alhaal';
const VIDEO_HOST = /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|doubleclick\.net)$/;

// Curriculum order = lesson-tree order, filtered to lessons with a video. (Every
// current video's lesson is a tree node; asserted in the index test below.)
const orderedSlugs = tree.nodes.map((node) => node.lessonId).filter((slug) => slug in videos);

// Arabic titles are shown without the YouTube channel suffix (" | النحو الكافي").
const TITLE = displayTitleAr(video.title.ar);

/** Record requests to YouTube-family hosts and stub the embed (hermetic suite). */
async function trackVideoHosts(page: Page): Promise<string[]> {
  const hits: string[] = [];
  page.on('request', (request) => {
    if (VIDEO_HOST.test(new URL(request.url()).hostname)) hits.push(request.url());
  });
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }),
  );
  return hits;
}

/** Every JSON-LD block on the page, parsed (a parse failure fails the test). */
async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => {
    const data = JSON.parse(text);
    const nodes = Array.isArray(data) ? data : [data];
    return nodes.flatMap((node) => (Array.isArray(node['@graph']) ? node['@graph'] : [node]));
  });
}

interface ClipLd {
  '@type': string;
  name: string;
  startOffset: number;
  endOffset: number;
  url: string;
}

interface VideoLd {
  '@context': string;
  '@id': string;
  name: string;
  description: string;
  uploadDate: string;
  duration: string;
  embedUrl: string;
  inLanguage: string;
  url: string;
  thumbnailUrl: string[];
  isPartOf: { '@id': string };
  hasPart: ClipLd[];
}

const pathOf = (url: string) => new URL(url).pathname;

async function canonical(page: Page): Promise<URL> {
  const href = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(href, 'canonical link').toBeTruthy();
  return new URL(href!);
}

test.describe('watch page', () => {
  test('shows the player without any click, with no autoplay, inside the first viewport', async ({ page }) => {
    await trackVideoHosts(page);
    await page.goto(`/videos/${SLUG}`);

    const iframe = page.locator('iframe');
    await expect(iframe).toHaveCount(1);
    const src = new URL((await iframe.getAttribute('src'))!);
    expect(src.origin + src.pathname).toBe(EMBED);
    expect(src.searchParams.has('autoplay')).toBe(false);
    expect(src.searchParams.has('start')).toBe(false);
    await expect(iframe).toHaveAttribute('title', TITLE);
    await expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

    // Above the fold: the whole player is visible before any scrolling.
    const box = (await iframe.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
    // …and it precedes the heading: the video is the main content.
    const heading = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
    expect(heading.y).toBeGreaterThan(box.y + box.height - 1);
  });

  test('the iframe is in the server-rendered HTML (visible to crawlers without JS)', async ({ request }) => {
    const html = await (await request.get(`/videos/${SLUG}`)).text();
    expect(html).toContain(`<iframe src="${EMBED}?rel=0"`);
  });

  test('renders the Arabic title, summary, chapters, lesson link and quiz link', async ({ page }) => {
    await trackVideoHosts(page);
    await page.goto(`/videos/${SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
    // The suffix is stripped at render time only: the data keeps the YouTube title.
    expect(video.title.ar).toMatch(/\| النحو الكافي$/);
    expect(TITLE).not.toContain('النحو الكافي');
    // …and the document title carries the site name once (from the layout template), not twice.
    expect((await page.title()).match(/النحو الكافي/g)).toHaveLength(1);
    await expect(page.getByText(video.summary.ar)).toBeVisible();

    const items = page.locator('ol > li');
    await expect(items).toHaveCount(chapters.length);
    for (const [i, chapter] of chapters.entries()) {
      await expect(items.nth(i)).toContainText(chapter.title);
      await expect(items.nth(i).locator('a')).toHaveAttribute('href', `?t=${chapter.startSeconds}`);
    }

    await expect(page.locator(`main a[href="/lessons/${SLUG}"]`)).toBeVisible();
    await expect(page.locator(`main a[href="/quiz?lesson=${SLUG}"]`)).toBeVisible();
    await expect(page.locator('main a[href="/videos"]')).toBeVisible();
  });

  test('JSON-LD has a valid VideoObject with Clips', async ({ page, request }) => {
    await trackVideoHosts(page);
    await page.goto(`/videos/${SLUG}`);
    const nodes = await jsonLd(page);
    const objects = nodes.filter((node) => node['@type'] === 'VideoObject');
    expect(objects).toHaveLength(1);
    const ld = objects[0] as unknown as VideoLd;

    expect(ld['@context']).toBe('https://schema.org');
    expect(ld.name).toBe(TITLE);
    expect(ld.description).toBe(video.summary.ar);
    expect(ld.uploadDate).toBe(video.uploadDate);
    expect(ld.duration).toMatch(/^PT(\d+H)?(\d+M)?(\d+S)?$/);
    expect(ld.embedUrl).toBe(EMBED);
    expect(ld.inLanguage).toBe('ar');
    expect(pathOf(ld.url)).toBe(`/videos/${SLUG}`);
    expect(pathOf(ld['@id'])).toBe(`/videos/${SLUG}`);

    // Thumbnail: absolute URL of the self-hosted poster, and it really exists.
    expect(ld.thumbnailUrl).toHaveLength(1);
    expect(ld.thumbnailUrl[0]).toMatch(/^https?:\/\//);
    expect(pathOf(ld.thumbnailUrl[0])).toBe(`/videos/${SLUG}.jpg`);
    const poster = await request.get(pathOf(ld.thumbnailUrl[0]));
    expect(poster.status()).toBe(200);
    expect(poster.headers()['content-type']).toContain('image/jpeg');

    // Linked to the (Arabic) lesson's LearningResource by @id.
    const lessonId = new URL(ld.isPartOf['@id']);
    expect(lessonId.pathname + lessonId.hash).toBe(`/lessons/${SLUG}#lesson`);

    // One Clip per chapter; contiguous; the last ends at the video's end.
    expect(ld.hasPart).toHaveLength(chapters.length);
    ld.hasPart.forEach((clip, i) => {
      expect(clip['@type']).toBe('Clip');
      expect(clip.name).toBe(chapters[i].title);
      expect(clip.startOffset).toBe(chapters[i].startSeconds);
      expect(clip.endOffset).toBe(i + 1 < chapters.length ? chapters[i + 1].startSeconds : video.durationSeconds);
      const url = new URL(clip.url);
      expect(url.pathname).toBe(`/videos/${SLUG}`);
      expect(url.search).toBe(`?t=${chapters[i].startSeconds}`);
    });
  });

  test('clicking a chapter seeks the player and makes the URL shareable', async ({ page }) => {
    await trackVideoHosts(page);
    await page.goto(`/videos/${SLUG}`);
    const target = chapters[2];

    await page.locator(`ol a[href="?t=${target.startSeconds}"]`).click();

    const iframe = page.locator('iframe');
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute('src', new RegExp(`[?&]start=${target.startSeconds}(&|$)`));
    // Autoplay is allowed here: it follows a click, never a page load.
    await expect(iframe).toHaveAttribute('src', /[?&]autoplay=1(&|$)/);
    await expect(page).toHaveURL(new RegExp(`/videos/${SLUG}\\?t=${target.startSeconds}$`));
    await expect(page.locator(`ol a[href="?t=${target.startSeconds}"]`)).toHaveAttribute('aria-current', 'true');
    // No navigation happened: one history entry, same document.
    expect(pathOf(page.url())).toBe(`/videos/${SLUG}`);
  });

  test('opening a ?t= link starts there without autoplay, and the canonical drops the query', async ({ page }) => {
    await trackVideoHosts(page);
    const target = chapters[1];
    await page.goto(`/videos/${SLUG}?t=${target.startSeconds}`);

    const iframe = page.locator('iframe');
    await expect(iframe).toHaveAttribute('src', new RegExp(`[?&]start=${target.startSeconds}(&|$)`));
    expect(await iframe.getAttribute('src')).not.toContain('autoplay');
    await expect(iframe).toHaveCount(1);

    // ?t= must never become an indexable duplicate: canonical is the bare URL.
    const link = await canonical(page);
    expect(link.pathname).toBe(`/videos/${SLUG}`);
    expect(link.search).toBe('');
    expect(link.hash).toBe('');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });

  test('the canonical is the bare URL in the raw HTML of a ?t= request and after a chapter click', async ({
    page,
    request,
  }) => {
    // Server response for a ?t= request (what a crawler receives).
    const html = await (await request.get(`/videos/${SLUG}?t=77&utm_source=x`)).text();
    const hrefs = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toHaveLength(1);
    expect(new URL(hrefs[0]).pathname).toBe(`/videos/${SLUG}`);
    expect(new URL(hrefs[0]).search).toBe('');

    // And it does not change client-side when a chapter rewrites the address bar.
    await trackVideoHosts(page);
    await page.goto(`/videos/${SLUG}`);
    await page.locator(`ol a[href="?t=${chapters[3].startSeconds}"]`).click();
    await expect(page).toHaveURL(/\?t=\d+$/);
    expect((await canonical(page)).search).toBe('');
  });

  test('an out-of-range or malformed ?t= is ignored', async ({ page }) => {
    await trackVideoHosts(page);
    for (const bad of ['99999', '-5', 'abc', '1:17', `${video.durationSeconds}`]) {
      await page.goto(`/videos/${SLUG}?t=${encodeURIComponent(bad)}`);
      const src = new URL((await page.locator('iframe').getAttribute('src'))!);
      expect(src.searchParams.has('start'), `t=${bad}`).toBe(false);
    }
  });

  test('/en keeps the Arabic content, translates the chrome, and canonicalizes to the Arabic URL', async ({ page }) => {
    await trackVideoHosts(page);
    await page.goto(`/en/videos/${SLUG}`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveText(TITLE);
    await expect(page.getByText(video.summary.ar)).toBeVisible();
    await expect(page.getByText(video.summary.en)).toHaveCount(0);

    // Every Arabic block on this English page is marked lang/dir and rendered in
    // the site's Arabic webfont (Cairo) rather than the Latin body font.
    const bodyFont = await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily);
    for (const block of [h1, page.getByText(video.summary.ar), page.locator('ol')]) {
      await expect(block).toHaveAttribute('lang', 'ar');
      await expect(block).toHaveAttribute('dir', 'rtl');
      const font = await block.evaluate((el) => getComputedStyle(el).fontFamily);
      expect(font).toMatch(/cairo/i);
      expect(font).not.toBe(bodyFont);
    }
    await expect(page.locator('ol > li').first()).toHaveCSS('font-family', /cairo/i);
    // The webfont is actually loaded, not just named in the stack.
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => [...document.fonts].some((f) => /cairo/i.test(f.family) && f.status === 'loaded')),
    ).toBe(true);
    await expect(page.getByRole('heading', { name: 'Chapters' })).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(1);

    // Links stay inside /en.
    await expect(page.locator(`main a[href="/en/lessons/${SLUG}"]`)).toBeVisible();
    await expect(page.locator('main a[href="/en/videos"]')).toBeVisible();

    expect((await canonical(page)).pathname).toBe(`/videos/${SLUG}`);
    const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) =>
      links.map((l) => [l.getAttribute('hreflang'), new URL((l as HTMLLinkElement).href).pathname]),
    );
    expect(hreflangs).toEqual(
      expect.arrayContaining([
        ['ar', `/videos/${SLUG}`],
        ['x-default', `/videos/${SLUG}`],
      ]),
    );
    expect(hreflangs.some(([lang]) => lang === 'en')).toBe(false);

    // Same Arabic VideoObject as the canonical page.
    const ld = (await jsonLd(page)).find((node) => node['@type'] === 'VideoObject') as unknown as VideoLd;
    expect(ld.name).toBe(TITLE);
    expect(pathOf(ld.url)).toBe(`/videos/${SLUG}`);
  });

  test('a lesson without a video has no watch page', async ({ page }) => {
    expect((await page.goto(`/videos/${WITHOUT_VIDEO}`))?.status()).toBe(404);
    expect((await page.goto('/videos/no-such-video'))?.status()).toBe(404);
  });
});

test.describe('videos index', () => {
  test('lists every video in curriculum order, each linking to its watch page, with no YouTube request', async ({
    page,
  }) => {
    const hits = await trackVideoHosts(page);
    await page.goto('/videos');

    const cards = page.locator('main ul > li > a');
    await expect(cards).toHaveCount(orderedSlugs.length);
    expect(orderedSlugs.length).toBe(Object.keys(videos).length);
    expect(orderedSlugs[0]).toBe('elm_alnaho'); // the intro lesson leads
    for (const [i, slug] of orderedSlugs.entries()) {
      const card = cards.nth(i);
      await expect(card).toHaveAttribute('href', `/videos/${slug}`);
      await expect(card.locator('h3')).toHaveText(displayTitleAr(videos[slug as keyof typeof videos].title.ar));
      await expect(card).toContainText(videos[slug as keyof typeof videos].summary.ar);
      await expect(card.locator(`img[src="/videos/${slug}.jpg"]`)).toHaveCount(1);
    }

    await expect(page.locator('iframe')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(hits).toEqual([]);
    expect((await canonical(page)).pathname).toBe('/videos');
    // Structured data lives on watch pages only.
    expect((await jsonLd(page)).some((node) => node['@type'] === 'VideoObject')).toBe(false);
  });

  test('a card opens its watch page', async ({ page }) => {
    await trackVideoHosts(page);
    await page.goto('/videos');
    await page.locator(`main a[href="/videos/${SLUG}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/videos/${SLUG}$`));
    await expect(page.locator('iframe')).toHaveCount(1);
  });

  test('/en/videos shows English titles and summaries and links within /en', async ({ page }) => {
    await page.goto('/en/videos');
    const card = page.locator(`main a[href="/en/videos/${SLUG}"]`);
    await expect(card).toContainText(video.title.en);
    await expect(card).toContainText(video.summary.en);
    expect((await canonical(page)).pathname).toBe('/videos');
  });

  test('is linked from the lessons index and the footer', async ({ page }) => {
    await page.goto('/lessons');
    await expect(page.locator('main a[href="/videos"]')).toBeVisible();
    await expect(page.getByRole('contentinfo').locator('a[href="/videos"]')).toBeVisible();
  });
});

test.describe('lesson pages', () => {
  for (const path of [`/lessons/${SLUG}`, `/en/lessons/${SLUG}`, `/lessons/${WITHOUT_VIDEO}`]) {
    test(`${path} carries no VideoObject`, async ({ page }) => {
      await page.goto(path);
      const nodes = await jsonLd(page);
      expect(nodes.length).toBeGreaterThan(0);
      expect(JSON.stringify(nodes)).not.toContain('VideoObject');
      expect(JSON.stringify(nodes)).not.toContain('embedUrl');
      // The LearningResource now has the @id the watch page's VideoObject points at.
      const lesson = nodes.find((node) => node['@type'] === 'LearningResource') as unknown as { '@id': string };
      const id = new URL(lesson['@id']);
      expect(id.pathname + id.hash).toBe(`${path}#lesson`);
    });
  }

  test('a lesson with a video links to its watch page next to "Watch on YouTube"', async ({ page }) => {
    await page.goto(`/lessons/${SLUG}`);
    const caption = page.locator('figcaption');
    await expect(caption.getByRole('link', { name: 'صفحة الفيديو' })).toHaveAttribute('href', `/videos/${SLUG}`);
    await expect(caption.getByRole('link', { name: 'شاهد على يوتيوب' })).toBeVisible();
    // Still a facade: no iframe until the play button is clicked.
    await expect(page.locator('iframe')).toHaveCount(0);

    await page.goto(`/en/lessons/${SLUG}`);
    await expect(page.locator('figcaption').getByRole('link', { name: 'Video page' })).toHaveAttribute(
      'href',
      `/en/videos/${SLUG}`,
    );
  });

  test('a lesson without a video has no watch-page link', async ({ page }) => {
    await page.goto(`/lessons/${WITHOUT_VIDEO}`);
    await expect(page.locator('main a[href^="/videos/"]')).toHaveCount(0);
  });
});

test('sitemap.xml lists /videos and every watch page with a video entry', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const paths = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => pathOf(m[1]));
  expect(paths.filter((p) => p === '/videos')).toHaveLength(1);
  expect(paths.filter((p) => p.startsWith('/videos/'))).toEqual(orderedSlugs.map((slug) => `/videos/${slug}`));
  expect(paths.some((p) => p.startsWith('/en/videos'))).toBe(false);
  expect(xml.match(/<video:video>/g)).toHaveLength(orderedSlugs.length);
  expect(xml).toContain(`<video:player_loc>${EMBED}</video:player_loc>`);
});
