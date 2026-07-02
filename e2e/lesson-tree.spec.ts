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
