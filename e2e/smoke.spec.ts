import { test, expect } from '@playwright/test';

// Smoke: every public page renders a 200 with the right document direction and
// no console errors / unhandled rejections. A content site's worst failure is a
// blank or 500 page, so this is the front line.

// (path, expected <html dir>, expected <html lang>)
const PAGES: Array<[string, 'rtl' | 'ltr', string]> = [
  ['/', 'rtl', 'ar'],
  ['/en', 'ltr', 'en'],
  ['/lessons', 'rtl', 'ar'],
  ['/en/lessons', 'ltr', 'en'],
  ['/i3rab', 'rtl', 'ar'],
  ['/en/i3rab', 'ltr', 'en'],
  ['/support', 'rtl', 'ar'],
  ['/en/support', 'ltr', 'en'],
  ['/privacy', 'rtl', 'ar'],
  ['/en/privacy', 'ltr', 'en'],
  ['/terms', 'rtl', 'ar'],
  ['/en/terms', 'ltr', 'en'],
];

// Console noise that is an artifact of testing over plain http, NOT an app bug:
//  - ERR_SSL_PROTOCOL_ERROR: the prod CSP sends `upgrade-insecure-requests`, so
//    the browser upgrades a self-referential subresource to https://localhost,
//    which the http test server can't speak. In prod (real HTTPS) it loads fine.
//  - ERR_ABORTED: Next cancels in-flight `_rsc` route prefetches on navigation.
const HTTP_TEST_ARTIFACTS = /ERR_SSL_PROTOCOL_ERROR|ERR_ABORTED/;

for (const [path, dir, lang] of PAGES) {
  test(`${path} renders 200 with dir=${dir} and no page errors`, async ({ page }) => {
    const errors: string[] = [];
    const note = (s: string) => !HTTP_TEST_ARTIFACTS.test(s) && errors.push(s);
    page.on('console', (m) => m.type() === 'error' && note(m.text()));
    page.on('pageerror', (e) => note(String(e)));

    const res = await page.goto(path, { waitUntil: 'networkidle' });
    expect(res?.status(), `HTTP status for ${path}`).toBe(200);

    await expect(page.locator('html')).toHaveAttribute('dir', dir);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);

    // Header, main landmark, and footer must all be present on every page.
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();

    expect(errors, `console/page errors on ${path}:\n${errors.join('\n')}`).toEqual([]);
  });
}

test('unknown route under a valid locale renders the localized 404 (not a 500)', async ({
  page,
}) => {
  const res = await page.goto('/this-page-does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.getByText('404')).toBeVisible();
  // Still inside the locale layout (header/footer present).
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('a dotted single-segment path (e.g. /.env) returns 404, never a 500', async ({ page }) => {
  // Regression: these bypass the next-intl middleware and previously risked a 500
  // in generateMetadata (see app/[locale]/layout.tsx comment).
  const res = await page.goto('/.env');
  expect([404]).toContain(res?.status());
});

test('an unknown lesson slug 404s instead of crashing the renderer', async ({ page }) => {
  const res = await page.goto('/lessons/no-such-lesson');
  expect(res?.status()).toBe(404);
});

test('an unknown i3rab slug 404s', async ({ page }) => {
  const res = await page.goto('/i3rab/no-such-entry');
  expect(res?.status()).toBe(404);
});
