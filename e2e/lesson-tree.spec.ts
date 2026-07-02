import { test, expect } from '@playwright/test';

// Lesson tree (feature 053): the list/tree toggle, node sheet, and the
// content-completion unlock loop. Progress lives in localStorage, so each test
// starts from a clean context (no prior completion). Runs under the default
// Arabic locale (playwright.config `locale: 'ar'`), so labels are Arabic.

const TREE_LABEL = 'شجرة الدروس'; // treeRegionLabel
const ROOT = 'الدرس: علم النحو'; // treeNodeAria for elm_alnaho (entry point)
const CHILD = 'الدرس: أقسام الكلام'; // treeNodeAria for aqsam_kalam (prereq: elm_alnaho)

async function openTree(page: import('@playwright/test').Page) {
  await page.goto('/lessons');
  await page.getByRole('button', { name: 'شجرة' }).click(); // viewTree toggle
  await expect(page.getByRole('group', { name: TREE_LABEL })).toBeVisible();
}

test('toggles to the tree view and persists the choice across reloads', async ({ page }) => {
  await openTree(page);
  await page.reload();
  // Preference restored from localStorage → tree still shown after reload.
  await expect(page.getByRole('group', { name: TREE_LABEL })).toBeVisible();
});

test('zoom controls change the zoom level and clamp at the reset', async ({ page }) => {
  await openTree(page);
  await expect(page.getByText('100%')).toBeVisible();
  await page.getByRole('button', { name: 'تكبير' }).click(); // zoom in
  await expect(page.getByText('120%')).toBeVisible();
  await page.getByRole('button', { name: 'إعادة الضبط' }).click(); // reset
  await expect(page.getByText('100%')).toBeVisible();
});

test('fit-to-view scales the tree to fit and reset returns to 100%', async ({ page }) => {
  await openTree(page);
  await page.getByRole('button', { name: 'ملء الشاشة' }).click(); // fit
  // The full tree is taller than the viewport, so fit zooms out below 100%.
  await expect(page.getByText('100%')).toHaveCount(0);
  await page.getByRole('button', { name: 'إعادة الضبط' }).click();
  await expect(page.getByText('100%')).toBeVisible();
});

test('every node stays reachable after zooming in (RTL scroll bounds)', async ({ page }) => {
  await openTree(page);
  // Zoom well past 100% so the canvas overflows the viewport on both axes.
  const zoomIn = page.getByRole('button', { name: 'تكبير' });
  await zoomIn.click();
  await zoomIn.click();
  await zoomIn.click();

  // Sweep scrollLeft across its full (dir-normalised) range and confirm every
  // node can be brought fully into view. Regression guard: under the page's
  // native RTL scroll origin the scaled canvas used to spill past the sizing
  // wrapper, leaving the leftmost columns permanently unreachable.
  const { total, reachable } = await page.evaluate(() => {
    const el = document.querySelector('[role="group"][aria-label="شجرة الدروس"]') as HTMLElement;
    const nodes = [...el.querySelectorAll('button')].filter((b) =>
      (b.getAttribute('aria-label') ?? '').startsWith('الدرس'),
    );
    el.scrollLeft = -1e7;
    const lo = el.scrollLeft;
    el.scrollLeft = 1e7;
    const hi = el.scrollLeft;
    const min = Math.min(lo, hi);
    const max = Math.max(lo, hi);
    const seen = new Set<number>();
    for (let i = 0; i <= 60; i++) {
      el.scrollLeft = min + ((max - min) * i) / 60;
      const er = el.getBoundingClientRect();
      nodes.forEach((n, idx) => {
        const nr = n.getBoundingClientRect();
        if (nr.left >= er.left - 0.5 && nr.right <= er.right + 0.5) seen.add(idx);
      });
    }
    return { total: nodes.length, reachable: seen.size };
  });
  expect(total).toBeGreaterThan(0);
  expect(reachable).toBe(total);
});

test('hovering a node highlights its prerequisite path', async ({ page }) => {
  await openTree(page);
  // No path is lit until a node is engaged.
  await expect.poll(() => page.locator('svg path.text-primary').count()).toBe(0);
  await page.getByRole('button', { name: CHILD }).hover();
  // The edge from the prerequisite (علم النحو) to the hovered child lights up.
  await expect.poll(() => page.locator('svg path.text-primary').count()).toBeGreaterThan(0);
});

test('the tree canvas is the horizontal scroller — the page never overflows', async ({ page }) => {
  await openTree(page);
  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(pageOverflow).toBeLessThanOrEqual(0);
});

test('a node opens its detail sheet with an Open lesson link', async ({ page }) => {
  await openTree(page);
  await page.getByRole('button', { name: ROOT }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'فتح الدرس' })).toBeVisible();
  // Escape closes and returns focus to the triggering node.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('completing a prerequisite unlocks its dependent node', async ({ page }) => {
  await openTree(page);

  // The child is locked: its sheet shows the "complete these first" hint and
  // offers no completion toggle.
  await page.getByRole('button', { name: CHILD }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByText('أكمِل هذه الدروس أولًا:')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'أكملتُ هذا الدرس' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // Complete the root (entry point) from its sheet.
  await page.getByRole('button', { name: ROOT }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'أكملتُ هذا الدرس' }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // Now the child is available: no locked hint, and it offers the completion
  // toggle.
  await page.getByRole('button', { name: CHILD }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('أكمِل هذه الدروس أولًا:')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'أكملتُ هذا الدرس' })).toBeVisible();
});

test('Mark as complete on the lesson page reflects in the tree', async ({ page }) => {
  // Complete the entry lesson from its detail page.
  await page.goto('/lessons/elm_alnaho');
  await page.getByRole('button', { name: 'أكملتُ هذا الدرس' }).click();
  await expect(page.getByRole('button', { name: 'مكتمل' })).toBeVisible();

  // The tree reflects it: the root node's sheet reports the Completed state.
  await openTree(page);
  await page.getByRole('button', { name: ROOT }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('مكتمل')).toBeVisible();
});
