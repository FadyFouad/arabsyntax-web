import { test, expect, type Locator } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Arabic-only content (i3rab, mutun) is served on /en with translated chrome.
// There the body is LTR in the Latin font stack, so every Arabic block must say
// so itself: lang="ar" (screen readers, hyphenation, font selection), dir="rtl"
// (alignment, punctuation) and the site's Arabic webfont. Without them the text
// renders left-aligned in a system fallback face.

const ROOT = process.cwd();
const i3rabSlug = readdirSync(path.join(ROOT, 'content', 'i3rab', 'ar'))
  .filter((f) => f.endsWith('.json'))
  .sort()[0]
  .slice(0, -5);
const mutunManifest = JSON.parse(readFileSync(path.join(ROOT, 'content', 'mutun', 'manifest.json'), 'utf8')) as {
  mutun: { id: string; paged?: boolean }[];
};
const singleMatn = mutunManifest.mutun.find((m) => m.paged !== true)!;
const pagedMatn = mutunManifest.mutun.find((m) => m.paged === true);

async function expectArabicBlock(block: Locator, what: string) {
  await expect(block, what).toHaveAttribute('lang', 'ar');
  await expect(block, what).toHaveAttribute('dir', 'rtl');
  const font = await block.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font, `${what} font`).toMatch(/cairo/i);
  // Arabic letters are really in there (not an English fallback string).
  expect(await block.textContent(), what).toMatch(/[؀-ۿ]/);
}

test.describe('/en/i3rab', () => {
  test('detail page marks the sentence, word list, explanation and lesson name as Arabic', async ({ page }) => {
    await page.goto(`/en/i3rab/${i3rabSlug}`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    const article = page.locator('main article');

    await expectArabicBlock(article.getByRole('heading', { level: 1 }), 'sentence');
    await expectArabicBlock(article.locator('ol'), 'word list');
    // Translated labels stay English and LTR.
    const label = article.getByRole('heading', { level: 2, name: 'Word analysis' });
    await expect(label).toBeVisible();
    await expect(label).not.toHaveAttribute('lang', 'ar');

    // Every Arabic text node in the article sits inside a lang="ar" block.
    const stray = await article.evaluate((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const out: string[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (/[؀-ۿ]/.test(node.textContent ?? '') && !node.parentElement?.closest('[lang="ar"]')) {
          out.push((node.textContent ?? '').trim().slice(0, 40));
        }
      }
      return out;
    });
    expect(stray).toEqual([]);
  });

  test('index marks every Arabic sentence card and lesson heading', async ({ page }) => {
    await page.goto('/en/i3rab');
    const cards = page.locator('main ul > li p');
    expect(await cards.count()).toBeGreaterThan(0);
    await expectArabicBlock(cards.first(), 'first card');
    await expect(page.locator('main ul > li p:not([lang="ar"])')).toHaveCount(0);

    const stray = await page.locator('main').evaluate((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const out: string[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest('script')) continue;
        if (/[؀-ۿ]/.test(node.textContent ?? '') && !node.parentElement?.closest('[lang="ar"]')) {
          out.push((node.textContent ?? '').trim().slice(0, 40));
        }
      }
      return out;
    });
    expect(stray).toEqual([]);
  });

  test('the Arabic page is unaffected (already Arabic, RTL, Cairo)', async ({ page }) => {
    await page.goto(`/i3rab/${i3rabSlug}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expectArabicBlock(page.locator('main article').getByRole('heading', { level: 1 }), 'sentence');
  });
});

test.describe('/en/mutun', () => {
  test('index cards declare their Arabic content', async ({ page }) => {
    await page.goto('/en/mutun');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expectArabicBlock(page.locator('main [dir="rtl"]').first(), 'matn card');
    await expect(page.locator('main [dir="rtl"]:not([lang="ar"])')).toHaveCount(0);
  });

  test('matn page declares its Arabic header and body', async ({ page }) => {
    await page.goto(`/en/mutun/${singleMatn.id}`);
    await expectArabicBlock(page.locator('main header'), 'matn header');
    await expectArabicBlock(page.locator('main article').first(), 'matn body');
    await expect(page.locator('main [dir="rtl"]:not([lang="ar"])')).toHaveCount(0);
  });

  test('paged matn index and unit pages declare their Arabic blocks', async ({ page }) => {
    test.skip(!pagedMatn, 'no paged matn in the manifest');
    await page.goto(`/en/mutun/${pagedMatn!.id}`);
    await expectArabicBlock(page.locator('main nav').first(), 'unit index');
    await expect(page.locator('main [dir="rtl"]:not([lang="ar"])')).toHaveCount(0);

    await page.locator(`main nav a[href*="/mutun/${pagedMatn!.id}/"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/en/mutun/${pagedMatn!.id}/.+`));
    await expect(page.locator('main [dir="rtl"]:not([lang="ar"])')).toHaveCount(0);
    await expectArabicBlock(page.locator('main [dir="rtl"]').first(), 'unit page');
  });
});
