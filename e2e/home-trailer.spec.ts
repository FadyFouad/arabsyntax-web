import { test, expect, type Page } from '@playwright/test';
import channel from '../content/channel.json';
import { displayTitleAr } from '../lib/videos/format';

// Homepage channel trailer (feature 011): a <section id="videos"> right after
// the Hero, with the trailer behind the click-to-load facade. Contract:
//   • loading the homepage makes no request to YouTube/Google
//   • the iframe exists only after the play button is clicked
//   • the section links to the first lesson's video, the /videos index and the
//     channel's subscribe page
//   • the homepage carries no VideoObject (the trailer is not its main content)
//
// Runs under the default Arabic locale (playwright.config `locale: 'ar'`).

const { trailer, channelUrl } = channel;
const EMBED = `https://www.youtube-nocookie.com/embed/${trailer.youtubeId}`;
const SUBSCRIBE = `${channelUrl}?sub_confirmation=1`;
const POSTER = '/videos/trailer.jpg';
const THIRD_PARTY = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|ytimg\.com|googlevideo\.com|doubleclick\.net|google\.com|gstatic\.com|googleapis\.com)$/;

const LOCALES = [
  {
    name: 'ar',
    home: '/',
    prefix: '',
    play: `تشغيل الفيديو: ${displayTitleAr(trailer.title.ar)}`,
    title: displayTitleAr(trailer.title.ar),
    heading: 'النحو بالصوت والصورة',
    lessonOne: 'ابدأ من الدرس الأول',
    allVideos: 'كل الدروس بالفيديو',
    subscribe: 'اشترك في القناة على يوتيوب',
  },
  {
    name: 'en',
    home: '/en',
    prefix: '/en',
    play: `Play video: ${trailer.title.en}`,
    title: trailer.title.en,
    heading: 'See Arabic grammar in action',
    lessonOne: 'Start with Lesson One',
    allVideos: 'All video lessons',
    subscribe: 'Subscribe on YouTube',
  },
] as const;

/** Record requests to YouTube/Google hosts and stub the embed (hermetic suite). */
async function trackThirdParty(page: Page): Promise<string[]> {
  const hits: string[] = [];
  page.on('request', (request) => {
    if (THIRD_PARTY.test(new URL(request.url()).hostname)) hits.push(request.url());
  });
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }),
  );
  return hits;
}

async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => {
    const data = JSON.parse(text);
    const nodes = Array.isArray(data) ? data : [data];
    return nodes.flatMap((node) => (Array.isArray(node['@graph']) ? node['@graph'] : [node]));
  });
}

for (const loc of LOCALES) {
  test.describe(`homepage trailer (${loc.name})`, () => {
    test('the section sits directly after the Hero, with its heading and copy', async ({ page }) => {
      await trackThirdParty(page);
      await page.goto(loc.home);

      const section = page.locator('#videos');
      await expect(section).toHaveCount(1); // a single element owns the id
      await expect(section.getByRole('heading', { level: 2, name: loc.heading })).toBeVisible();

      // First section of <main> is the Hero (it holds the <h1>); #videos is next.
      const order = await page.locator('main > section').evaluateAll((sections) =>
        sections.slice(0, 3).map((s) => (s.querySelector('h1') ? 'hero' : s.id)),
      );
      expect(order.slice(0, 2)).toEqual(['hero', 'videos']);

      // Hero content is untouched and still starts the page.
      const hero = (await page.locator('main > section').first().boundingBox())!;
      const videos = (await section.boundingBox())!;
      expect(videos.y).toBeGreaterThanOrEqual(hero.y + hero.height - 1);
    });

    test('shows the facade with no iframe and no YouTube/Google request before the click', async ({ page }) => {
      const hits = await trackThirdParty(page);
      await page.goto(loc.home);
      const section = page.locator('#videos');

      await expect(section.getByRole('button', { name: loc.play, exact: true })).toBeVisible();
      const poster = section.locator(`img[src="${POSTER}"]`);
      await poster.scrollIntoViewIfNeeded();
      await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

      await expect(page.locator('iframe')).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      expect(hits).toEqual([]);
    });

    test('mounts the youtube-nocookie iframe only after the click', async ({ page }) => {
      const hits = await trackThirdParty(page);
      await page.goto(loc.home);
      const section = page.locator('#videos');
      await expect(page.locator('iframe')).toHaveCount(0);

      await section.getByRole('button', { name: loc.play, exact: true }).click();

      const iframe = section.locator('iframe');
      await expect(iframe).toHaveCount(1);
      await expect(page.locator('iframe')).toHaveCount(1);
      await expect(iframe).toHaveAttribute('src', new RegExp(`^${EMBED}\\?`));
      await expect(iframe).toHaveAttribute('title', loc.title);
      await expect(section.getByRole('button', { name: loc.play, exact: true })).toHaveCount(0);
      await expect(section.locator(`img[src="${POSTER}"]`)).toHaveCount(0);
      await expect.poll(() => hits.filter((url) => url.startsWith(EMBED)).length).toBe(1);
    });

    test('links to lesson one, the videos index and the channel subscribe page', async ({ page }) => {
      await trackThirdParty(page);
      await page.goto(loc.home);
      const section = page.locator('#videos');

      await expect(section.getByRole('link', { name: loc.lessonOne })).toHaveAttribute(
        'href',
        `${loc.prefix}/videos/elm_alnaho`,
      );
      await expect(section.getByRole('link', { name: loc.allVideos })).toHaveAttribute('href', `${loc.prefix}/videos`);

      const subscribe = section.getByRole('link', { name: loc.subscribe });
      await expect(subscribe).toHaveAttribute('href', SUBSCRIBE);
      await expect(subscribe).toHaveAttribute('target', '_blank');
      await expect(subscribe).toHaveAttribute('rel', 'noopener noreferrer');

      // The internal links work.
      await section.getByRole('link', { name: loc.allVideos }).click();
      await expect(page).toHaveURL(new RegExp(`${loc.prefix}/videos$`));
      await page.goto(loc.home);
      await page.locator('#videos').getByRole('link', { name: loc.lessonOne }).click();
      await expect(page).toHaveURL(new RegExp(`${loc.prefix}/videos/elm_alnaho$`));
      await expect(page.locator('iframe')).toHaveCount(1); // the watch page's own player
    });

    test('JSON-LD has no VideoObject, and the app node lists the channel as sameAs', async ({ page }) => {
      await page.goto(loc.home);
      const nodes = await jsonLd(page);
      expect(nodes.length).toBeGreaterThan(0);
      const serialized = JSON.stringify(nodes);
      expect(serialized).not.toContain('VideoObject');
      expect(serialized).not.toContain('embedUrl');
      expect(serialized).not.toContain(trailer.youtubeId);

      const app = nodes.find((node) => node['@type'] === 'SoftwareApplication') as { sameAs?: string[] };
      expect(app.sameAs).toEqual([channelUrl]);
      // The channel belongs to the product, not the developer organization.
      const org = nodes.find((node) => node['@type'] === 'Organization') as { sameAs?: string[] };
      expect(org.sameAs).toBeUndefined();
    });
  });
}

test('the poster box reserves its 16:9 space before the image loads (no layout shift)', async ({ page }) => {
  await trackThirdParty(page);
  // Never deliver the poster: the box must hold its shape on CSS alone.
  await page.route(`**${POSTER}`, (route) => route.abort());
  await page.goto('/');
  const section = page.locator('#videos');
  const button = section.getByRole('button', { name: /تشغيل الفيديو/ });
  await button.scrollIntoViewIfNeeded();
  const before = (await button.boundingBox())!;
  expect(before.width).toBeGreaterThan(200);
  expect(before.width / before.height).toBeCloseTo(16 / 9, 1);
  const viewport = page.viewportSize()!;
  expect(before.x).toBeGreaterThanOrEqual(0);
  expect(before.x + before.width).toBeLessThanOrEqual(viewport.width);

  // Activating swaps the poster for the player in the very same box.
  const sectionHeight = (await section.boundingBox())!.height;
  await button.click();
  const player = (await section.locator('iframe').boundingBox())!;
  expect(Math.abs(player.width - before.width)).toBeLessThan(3);
  expect(Math.abs(player.height - before.height)).toBeLessThan(3);
  expect(Math.abs((await section.boundingBox())!.height - sectionHeight)).toBeLessThan(2);
});

test('cumulative layout shift from the homepage load stays negligible', async ({ page }) => {
  await trackThirdParty(page);
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('#videos').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThan(0.05);
});

test('/#videos deep link scrolls the section into view', async ({ page }) => {
  await trackThirdParty(page);
  await page.goto('/#videos');
  await expect(page.locator('#videos')).toBeInViewport();
});
