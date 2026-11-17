import { test, expect, type Page } from '@playwright/test';
import videos from '../content/videos.json';
import { displayTitleAr } from '../lib/videos/format';

// Lesson video (feature 009): a click-to-load YouTube facade on lesson pages
// that have an entry in content/videos.json. The contract under test:
//   • before the click — poster + play button, NO iframe, NO request to YouTube
//   • after the click  — one youtube-nocookie.com iframe, facade gone
//   • a lesson without a video shows none of it
//
// Runs under the default Arabic locale (playwright.config `locale: 'ar'`).

const WITH_VIDEO = 'aqsam_kalam';
const WITHOUT_VIDEO = 'alhaal';
const video = videos[WITH_VIDEO];

// Arabic titles are shown without the YouTube channel suffix (" | النحو الكافي").
const TITLE_AR = displayTitleAr(video.title.ar);
const PLAY_AR = `تشغيل الفيديو: ${TITLE_AR}`; // lessons.videoPlay
const PLAY_EN = `Play video: ${video.title.en}`;
const WATCH_AR = 'شاهد على يوتيوب'; // lessons.videoWatchOnYoutube
const WATCH_EN = 'Watch on YouTube';

const EMBED_PREFIX = `https://www.youtube-nocookie.com/embed/${video.youtubeId}`;
const THIRD_PARTY_VIDEO_HOST = /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|doubleclick\.net)$/;

/**
 * Record every request to a YouTube-family host, and answer the embed with an
 * empty document so the suite never depends on YouTube being reachable.
 */
async function trackVideoHosts(page: Page): Promise<string[]> {
  const hits: string[] = [];
  page.on('request', (request) => {
    if (THIRD_PARTY_VIDEO_HOST.test(new URL(request.url()).hostname)) hits.push(request.url());
  });
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }),
  );
  return hits;
}

test.describe('lesson with a video', () => {
  test('shows the facade with no iframe and no YouTube request before the click', async ({ page }) => {
    const hits = await trackVideoHosts(page);
    await page.goto(`/lessons/${WITH_VIDEO}`);

    await expect(page.getByRole('button', { name: PLAY_AR, exact: true })).toBeVisible();
    // The suffix is stripped at render time only; the data keeps the YouTube title.
    expect(video.title.ar).toMatch(/\| النحو الكافي$/);
    await expect(page.getByRole('button', { name: /النحو الكافي/ })).toHaveCount(0);
    const poster = page.locator(`img[src="/videos/${WITH_VIDEO}.jpg"]`);
    await expect(poster).toBeVisible();
    // The self-hosted poster actually decoded (not a broken image).
    await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    await expect(page.locator('iframe')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(hits).toEqual([]);
  });

  test('mounts the youtube-nocookie iframe only after the click', async ({ page }) => {
    const hits = await trackVideoHosts(page);
    await page.goto(`/lessons/${WITH_VIDEO}`);
    await expect(page.locator('iframe')).toHaveCount(0);

    await page.getByRole('button', { name: PLAY_AR }).click();

    const iframe = page.locator('iframe');
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute('src', new RegExp(`^${EMBED_PREFIX}\\?`));
    await expect(iframe).toHaveAttribute('title', TITLE_AR);
    expect(TITLE_AR).not.toContain('النحو الكافي');
    // The facade is replaced, not layered under the player.
    await expect(page.getByRole('button', { name: PLAY_AR })).toHaveCount(0);
    await expect(page.locator(`img[src="/videos/${WITH_VIDEO}.jpg"]`)).toHaveCount(0);
    // The embed was allowed by the CSP (frame-src) and requested exactly once.
    await expect.poll(() => hits.filter((url) => url.startsWith(EMBED_PREFIX)).length).toBe(1);
  });

  test('the play button works from the keyboard', async ({ page }) => {
    await trackVideoHosts(page);
    await page.goto(`/lessons/${WITH_VIDEO}`);
    await page.getByRole('button', { name: PLAY_AR }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('iframe')).toHaveCount(1);
  });

  test('links to the video on YouTube in a new tab', async ({ page }) => {
    await page.goto(`/lessons/${WITH_VIDEO}`);
    const link = page.getByRole('link', { name: WATCH_AR });
    await expect(link).toHaveAttribute('href', `https://www.youtube.com/watch?v=${video.youtubeId}`);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('sits between the title and the lesson body, inside the page width', async ({ page }) => {
    await page.goto(`/lessons/${WITH_VIDEO}`);
    const title = await page.getByRole('heading', { level: 1 }).boundingBox();
    const player = await page.getByRole('button', { name: PLAY_AR }).boundingBox();
    expect(title && player).toBeTruthy();
    expect(player!.y).toBeGreaterThan(title!.y + title!.height - 1);
    // 16:9, and no horizontal overflow at either viewport (RTL page).
    expect(player!.width / player!.height).toBeCloseTo(16 / 9, 1);
    const viewport = page.viewportSize()!;
    expect(player!.x).toBeGreaterThanOrEqual(0);
    expect(player!.x + player!.width).toBeLessThanOrEqual(viewport.width);
  });

  test('English page uses the English strings and title (LTR)', async ({ page }) => {
    await trackVideoHosts(page);
    await page.goto(`/en/lessons/${WITH_VIDEO}`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.getByRole('link', { name: WATCH_EN })).toBeVisible();

    await page.getByRole('button', { name: PLAY_EN }).click();
    await expect(page.locator('iframe')).toHaveAttribute('title', video.title.en);
  });
});

test.describe('lesson without a video', () => {
  for (const path of [`/lessons/${WITHOUT_VIDEO}`, `/en/lessons/${WITHOUT_VIDEO}`]) {
    test(`${path} shows neither facade nor iframe`, async ({ page }) => {
      const hits = await trackVideoHosts(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      await expect(page.getByRole('button', { name: /تشغيل الفيديو|Play video/ })).toHaveCount(0);
      await expect(page.getByRole('link', { name: new RegExp(`${WATCH_AR}|${WATCH_EN}`) })).toHaveCount(0);
      await expect(page.locator('iframe')).toHaveCount(0);
      await expect(page.locator('img[src^="/videos/"]')).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      expect(hits).toEqual([]);
    });
  }
});
