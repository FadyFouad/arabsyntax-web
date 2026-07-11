import { test, expect, type Page } from '@playwright/test';
import {
  accountButton,
  onlyUid,
  PROFILE_FORM_DONE_KEY as DONE_KEY,
  profileFormDialog as profileForm,
  readDoc,
  resetEmulators,
  signIn,
  signInAsExisting,
  signOut,
  userDoc,
} from './helpers';

// Feature 008 — post-sign-in profile form. The two approved schema additions
// (learnerProfile map + learnerProfileSkippedAt) verified as what Firestore
// actually stored, through the same typed REST reads as auth.spec.ts.
//
// Every sign-in here passes keepProfileForm — the form itself is what's under
// test, so the helper must not auto-skip it.

const KEEP = { keepProfileForm: true };

/**
 * Wait until the visibility check for this page load has CONCLUDED with "don't
 * show": the gate stamps the localStorage hint the moment the document read
 * (or a completed submit/skip) proves the marker exists. Polling for the stamp
 * turns "the dialog never appeared" from a timing guess into a real signal.
 */
async function expectFormSuppressed(page: Page, uid: string) {
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), DONE_KEY)).toBe(uid);
  await expect(profileForm(page)).toHaveCount(0);
}

/** Fields of the stored learnerProfile map, by key. */
async function learnerProfileFields(uid: string) {
  const doc = await readDoc(userDoc(uid));
  return doc?.fields?.learnerProfile?.mapValue?.fields ?? null;
}

test.beforeEach(async () => {
  await resetEmulators();
});

test('a Google user sees the form without a name input; a goal-only submit stores exactly goal + updatedAt', async ({
  page,
}) => {
  await page.goto('/');
  await signIn(page, 'google', { email: 'sara@example.com', displayName: 'Sara' }, KEEP);

  const form = profileForm(page);
  await expect(form).toBeVisible();
  // Google provides a displayName, so the name question must not exist.
  await expect(form.getByLabel('ما اسمك؟')).toHaveCount(0);

  // Zero writes on open: with the form on screen, neither marker exists yet.
  const uid = await onlyUid();
  const before = await readDoc(userDoc(uid));
  expect(before?.fields?.learnerProfile).toBeUndefined();
  expect(before?.fields?.learnerProfileSkippedAt).toBeUndefined();

  await form.getByRole('button', { name: 'فهم القرآن الكريم' }).click();
  await form.getByRole('button', { name: 'حفظ' }).click();
  await expect(form).toHaveCount(0);

  const profile = await learnerProfileFields(uid);
  expect(profile?.goal?.stringValue).toBe('quran');
  // The app hard-casts timestamps; a stringValue here would break its reader.
  expect(profile?.updatedAt?.timestampValue).toBeTruthy();
  expect(Object.keys(profile ?? {}).sort()).toEqual(['goal', 'updatedAt']);

  // displayName untouched by a submit that carried no name.
  const after = await readDoc(userDoc(uid));
  expect(after?.fields?.displayName?.stringValue).toBe('Sara');

  // Completed → never again, even when the local hint is gone (another browser).
  await page.evaluate((key) => localStorage.removeItem(key), DONE_KEY);
  await page.reload();
  await expect(accountButton(page)).toBeVisible();
  await expectFormSuppressed(page, uid);
});

test('skipping writes only learnerProfileSkippedAt and silences the form for good', async ({
  page,
}) => {
  await page.goto('/');
  await signIn(page, 'google', { email: 'sara@example.com', displayName: 'Sara' }, KEEP);

  const form = profileForm(page);
  await expect(form).toBeVisible();
  await form.getByRole('button', { name: 'تخطي' }).click();
  await expect(form).toHaveCount(0);

  const uid = await onlyUid();
  // The skip write is fire-and-forget, so poll for it to land.
  await expect
    .poll(async () => {
      const doc = await readDoc(userDoc(uid));
      return doc?.fields?.learnerProfileSkippedAt?.timestampValue ?? null;
    })
    .toBeTruthy();

  const doc = await readDoc(userDoc(uid));
  expect(doc?.fields?.learnerProfile).toBeUndefined();
  expect(doc?.fields?.learnerProfileSkippedAt?.stringValue).toBeUndefined();

  // Skipped on "this device" → suppressed on a "fresh" one (hint removed, so
  // the decision can only come from the document marker).
  await page.evaluate((key) => localStorage.removeItem(key), DONE_KEY);
  await page.reload();
  await expect(accountButton(page)).toBeVisible();
  await expectFormSuppressed(page, uid);
});

test('a nameless Apple user gets the name input; the name is written once and never touched again', async ({
  page,
}) => {
  await page.goto('/');
  // No displayName in the emulator account — Apple's name-on-first-consent gap.
  await signIn(page, 'apple', { email: 'omar@example.com' }, KEEP);

  const form = profileForm(page);
  await expect(form).toBeVisible();

  await form.getByLabel('ما اسمك؟').fill('عمر');
  await form.getByRole('button', { name: 'حفظ' }).click();
  await expect(form).toHaveCount(0);

  const uid = await onlyUid();
  const doc = await readDoc(userDoc(uid));
  expect(doc?.fields?.displayName?.stringValue).toBe('عمر');
  // The name is a top-level field, never part of the learnerProfile map.
  const profile = await learnerProfileFields(uid);
  expect(Object.keys(profile ?? {})).toEqual(['updatedAt']);

  // Second sign-in: no form, and the stored name survives the re-upsert.
  await signOut(page);
  await page.evaluate((key) => localStorage.removeItem(key), DONE_KEY);
  await signInAsExisting(page, 'apple', 'omar@example.com', KEEP);
  await expectFormSuppressed(page, uid);

  const again = await readDoc(userDoc(uid));
  expect(again?.fields?.displayName?.stringValue).toBe('عمر');
});

test('thanaweya reveals the school stage; moving the goal away drops the stage from the payload', async ({
  page,
}) => {
  await page.goto('/');
  await signIn(page, 'google', { email: 'sara@example.com', displayName: 'Sara' }, KEEP);

  const form = profileForm(page);
  await expect(form).toBeVisible();

  // The stage question exists only under the thanaweya goal.
  await expect(form.getByRole('button', { name: 'الثالث الثانوي' })).toHaveCount(0);
  await form.getByRole('button', { name: 'الثانوية العامة' }).click();
  await form.getByRole('button', { name: 'الثالث الثانوي' }).click();

  // Change the goal away: the stage UI hides AND the stale answer must not be
  // submitted.
  await form.getByRole('button', { name: 'اهتمام عام' }).click();
  await expect(form.getByRole('button', { name: 'الثالث الثانوي' })).toHaveCount(0);

  // Also answer the searchable country select, storing the ISO code.
  await form.getByRole('combobox').fill('مصر');
  await form.getByRole('option', { name: 'مصر' }).getByRole('button').click();

  await form.getByRole('button', { name: 'حفظ' }).click();
  await expect(form).toHaveCount(0);

  const profile = await learnerProfileFields(await onlyUid());
  expect(profile?.goal?.stringValue).toBe('general_interest');
  expect(profile?.country?.stringValue).toBe('EG');
  expect(profile?.schoolStage).toBeUndefined();
  expect(Object.keys(profile ?? {}).sort()).toEqual(['country', 'goal', 'updatedAt']);
});
