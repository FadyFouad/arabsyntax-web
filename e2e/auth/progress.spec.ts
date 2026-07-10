import { test, expect } from '@playwright/test';
import {
  accountButton,
  completedFields,
  map,
  onlyUid,
  progressDoc,
  readDoc,
  resetEmulators,
  sameInstant,
  seedDoc,
  signIn,
  string,
  timestamp,
} from './helpers';

// US2 — lesson progress follows the user.
// Contract: specs/006-web-account-sync/contracts/firestore-progress.md

const SEEDED_TIMESTAMP = '2026-01-01T00:00:00.000Z';
const MARK_COMPLETE = 'أكملتُ هذا الدرس';
const COMPLETED = 'مكتمل';

test.beforeEach(async () => {
  await resetEmulators();
});

/** Both value types the app has shipped, deliberately mixed in one document. */
async function seedAppStyleProgress(uid: string) {
  await seedDoc(progressDoc(uid), {
    completed: map({
      elm_alnaho: timestamp(SEEDED_TIMESTAMP),
      aqsam_kalam: string(SEEDED_TIMESTAMP),
    }),
    updatedAt: timestamp(SEEDED_TIMESTAMP),
  });
}

async function signInAsSara(page: import('@playwright/test').Page) {
  await signIn(page, 'google', { email: 'sara@example.com', displayName: 'Sara' });
  await expect(accountButton(page)).toBeVisible();
  return onlyUid();
}

test('cloud completions written by the app show up on the web', async ({ page }) => {
  await page.goto('/');
  const uid = await signInAsSara(page);
  await seedAppStyleProgress(uid);

  await page.goto('/lessons');

  // Two badges — one per seeded lesson. The ISO-string value must count as a
  // completion just like the Timestamp one.
  await expect(page.getByText(COMPLETED, { exact: true })).toHaveCount(2);
});

test('Mark Complete adds one per-key entry and leaves app-written entries untouched', async ({
  page,
}) => {
  await page.goto('/');
  const uid = await signInAsSara(page);
  await seedAppStyleProgress(uid);

  await page.goto('/lessons/alesm');
  await page.getByRole('button', { name: MARK_COMPLETE }).click();

  await expect
    .poll(async () => Object.keys(completedFields(await readDoc(progressDoc(uid)))).sort())
    .toEqual(['alesm', 'aqsam_kalam', 'elm_alnaho']);

  const doc = await readDoc(progressDoc(uid));
  const completed = completedFields(doc);

  // The web write is a server timestamp…
  expect(completed.alesm?.timestampValue).toBeTruthy();
  // …and the two seeded entries are untouched: same instant, both value types
  // intact (the ISO string stayed a string, the timestamp stayed a timestamp).
  expect(sameInstant(completed.elm_alnaho?.timestampValue, SEEDED_TIMESTAMP)).toBe(true);
  expect(completed.aqsam_kalam?.stringValue).toBe(SEEDED_TIMESTAMP);

  // THE TRAP (contracts/firestore-progress.md §3): `setDoc(..., {merge:true})`
  // treats 'completed.alesm' as a LITERAL field name. Only `updateDoc` reads it
  // as a path. If this assertion ever fails, the app silently stops seeing web
  // completions — the document looks fine until you read the key names.
  expect(Object.keys(doc?.fields ?? {})).not.toContain('completed.alesm');
  expect(Object.keys(doc?.fields ?? {}).sort()).toEqual(['completed', 'updatedAt']);
});

test('the first-ever completion creates the document with a nested map', async ({ page }) => {
  await page.goto('/');
  const uid = await signInAsSara(page);

  // No progress document exists — `updateDoc` will fail with not-found and the
  // nested-map `setDoc` create must take over.
  expect(await readDoc(progressDoc(uid))).toBeNull();

  await page.goto('/lessons/elm_alnaho');
  await page.getByRole('button', { name: MARK_COMPLETE }).click();

  await expect
    .poll(async () => Object.keys(completedFields(await readDoc(progressDoc(uid)))))
    .toEqual(['elm_alnaho']);

  const doc = await readDoc(progressDoc(uid));
  expect(completedFields(doc).elm_alnaho?.timestampValue).toBeTruthy();
  expect(doc?.fields?.updatedAt?.timestampValue).toBeTruthy();
  expect(Object.keys(doc?.fields ?? {})).not.toContain('completed.elm_alnaho');
});

test('completing while signed out, then signing in, merges the completion up', async ({ page }) => {
  // FR-16: the union merge. Nothing is removed on either side.
  await page.goto('/lessons/elm_alnaho');
  await page.getByRole('button', { name: MARK_COMPLETE }).click();
  await expect(page.getByRole('button', { name: COMPLETED })).toBeVisible();

  // FR-17: the completion prompts a sign-in offer.
  const nudge = page.getByRole('complementary', { name: /احفظ تقدّمك/ });
  await expect(nudge).toBeVisible();
  await nudge.getByRole('button', { name: /إخفاء/ }).click();

  const uid = await signInAsSara(page);

  await expect
    .poll(async () => Object.keys(completedFields(await readDoc(progressDoc(uid)))))
    .toEqual(['elm_alnaho']);

  // And it is still complete locally.
  await page.goto('/lessons');
  await expect(page.getByText(COMPLETED, { exact: true })).toHaveCount(1);
});

test('signing in pulls cloud progress down without pushing deletions up', async ({ page }) => {
  await page.goto('/');
  const uid = await signInAsSara(page);
  await seedAppStyleProgress(uid);

  // Reload so the sign-in pipeline runs against the seeded document.
  await page.goto('/lessons/almasdar');
  await page.getByRole('button', { name: MARK_COMPLETE }).click();

  await expect
    .poll(async () => Object.keys(completedFields(await readDoc(progressDoc(uid)))).sort())
    .toEqual(['almasdar', 'aqsam_kalam', 'elm_alnaho']);

  // The local store holds the union: three completions, none dropped.
  await page.goto('/lessons');
  await expect(page.getByText(COMPLETED, { exact: true })).toHaveCount(3);
});

test('a signed-in user cannot un-complete a lesson', async ({ page }) => {
  // FR-15 monotonic: un-completing would have to delete a key the phone still
  // shows. The affordance simply is not rendered.
  await page.goto('/');
  await signInAsSara(page);

  await page.goto('/lessons/elm_alnaho');
  await page.getByRole('button', { name: MARK_COMPLETE }).click();

  await expect(page.getByText(COMPLETED, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: COMPLETED })).toHaveCount(0);
});

test('a signed-out user can still un-complete locally', async ({ page }) => {
  await page.goto('/lessons/elm_alnaho');

  const toggle = page.getByRole('button', { name: MARK_COMPLETE });
  await toggle.click();

  const completed = page.getByRole('button', { name: COMPLETED });
  await expect(completed).toBeVisible();
  await completed.click();

  await expect(page.getByRole('button', { name: MARK_COMPLETE })).toBeVisible();
});
