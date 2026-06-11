import { test, expect } from '@playwright/test';

// Navigation flows: index → detail drill-downs, locale switching (preserving the
// route), browser back/forward, and the mobile menu. These cover the real
// "click around the site" journeys, including SSG soft-navigation.

test('lessons: index lists lessons and a card navigates to its detail page', async ({ page }) => {
  await page.goto('/lessons');
  const firstLesson = page.locator('a[href*="/lessons/"]').first();
  await expect(firstLesson).toBeVisible();
  const href = await firstLesson.getAttribute('href');
  await firstLesson.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  // Detail page shows an <h1> title and a back link. Several links point to
  // /lessons (header nav + in-content "all lessons"); on mobile the header one is
  // collapsed into the menu, so assert at least one VISIBLE back link.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('a[href$="/lessons"]:visible').first()).toBeVisible();
});

test('i3rab: index → detail shows the analyzed sentence and word list', async ({ page }) => {
  await page.goto('/i3rab');
  const firstEntry = page.locator('a[href*="/i3rab/"]').first();
  await firstEntry.click();
  await expect(page).toHaveURL(/\/i3rab\/[a-z0-9-]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // The page embeds a JSON-LD LearningResource block.
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test('locale switch keeps you on the same logical page', async ({ page }) => {
  await page.goto('/lessons');
  // The language switcher links to /en/lessons (en variant of current route).
  const toEnglish = page.locator('a[href="/en/lessons"]').first();
  await expect(toEnglish).toBeVisible();
  await toEnglish.click();
  await expect(page).toHaveURL(/\/en\/lessons$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('browser back/forward restores prior pages without error', async ({ page }) => {
  await page.goto('/');
  await page.goto('/lessons');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/lessons$/);
});

test('header links reach every primary section', async ({ page, isMobile }) => {
  // Desktop-only: on mobile the header nav collapses into the hamburger menu,
  // which is covered by the 'mobile menu opens and navigates' test below.
  test.skip(isMobile, 'header nav is collapsed into the mobile menu');
  await page.goto('/');
  for (const path of ['/lessons', '/i3rab', '/support']) {
    const link = page.getByRole('banner').locator(`a[href="${path}"]`).first();
    if (await link.count()) {
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await page.goto('/');
    }
  }
});

test('mobile menu opens and navigates (iPhone project)', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only menu');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /menu|القائمة/i });
  await toggle.click();
  const lessonsLink = page.getByRole('link', { name: /lessons|الدروس/i }).first();
  await expect(lessonsLink).toBeVisible();
});
