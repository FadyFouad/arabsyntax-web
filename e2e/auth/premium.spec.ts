import { test, expect } from '@playwright/test';
import {
  accountButton,
  onlyUid,
  openAccountMenu,
  purchasesDoc,
  readDoc,
  resetEmulators,
  seedDoc,
  signIn,
  string,
  timestamp,
  type FirestoreValue,
} from './helpers';

// US3 — premium status visible on web.
// Contract: specs/006-web-account-sync/contracts/premium-resolution.md

const PREMIUM_LABEL = 'مميّز';

const FUTURE = '2030-01-01T00:00:00.000Z';
const PAST = '2020-01-01T00:00:00.000Z';

test.beforeEach(async () => {
  await resetEmulators();
});

/**
 * Sign in, plant a purchases document, then RELOAD — the entitlement is resolved
 * once per session (D-4, no realtime listener), so it must be in place before
 * the session that reads it.
 */
async function signInWithPurchase(
  page: import('@playwright/test').Page,
  purchase: Record<string, FirestoreValue> | null,
) {
  await page.goto('/');
  await signIn(page, 'google', { email: 'sara@example.com', displayName: 'Sara' });
  await expect(accountButton(page)).toBeVisible();

  const uid = await onlyUid();
  if (purchase) await seedDoc(purchasesDoc(uid), purchase);

  await page.reload();
  await expect(accountButton(page)).toBeVisible();
  return uid;
}

const GRANTS: Array<[string, Record<string, FirestoreValue>]> = [
  ['a lifetime plan', { currentPlan: string('lifetime') }],
  [
    'a cancelled monthly subscription that has not run out yet',
    {
      currentPlan: string('monthly'),
      subscriptionStatus: string('cancelled'),
      subscriptionExpiryDate: timestamp(FUTURE),
    },
  ],
  ['a yearly subscription with no expiry recorded', { currentPlan: string('yearly') }],
];

const DENIES: Array<[string, Record<string, FirestoreValue> | null]> = [
  ['no purchases document at all', null],
  [
    'an expired monthly subscription',
    { currentPlan: string('monthly'), subscriptionStatus: string('expired') },
  ],
  [
    'a monthly subscription whose expiry has passed',
    { currentPlan: string('monthly'), subscriptionExpiryDate: timestamp(PAST) },
  ],
  // ⚠ The Cloud Function grants this one. The web resolver does not, by design
  // (locked decision D-5). See lib/firebase/contracts/premium.ts.
  ['a legacyPremium plan (the intentional D-5 delta)', { currentPlan: string('legacyPremium') }],
  ['an unknown plan', { currentPlan: string('trial') }],
];

for (const [label, purchase] of GRANTS) {
  test(`shows the Premium label for ${label}`, async ({ page }) => {
    await signInWithPurchase(page, purchase);
    const menu = await openAccountMenu(page);
    await expect(menu.getByText(PREMIUM_LABEL)).toBeVisible();
  });
}

for (const [label, purchase] of DENIES) {
  test(`hides the Premium label for ${label}`, async ({ page }) => {
    await signInWithPurchase(page, purchase);
    const menu = await openAccountMenu(page);
    await expect(menu.getByText(PREMIUM_LABEL)).toHaveCount(0);
    // The user is still signed in and functional — a missing entitlement is not
    // an error state.
    await expect(menu).toContainText('Sara');
  });
}

test('never writes to purchases/{uid} (the rules forbid it)', async ({ page }) => {
  const uid = await signInWithPurchase(page, { currentPlan: string('lifetime') });
  await openAccountMenu(page);

  const doc = await readDoc(purchasesDoc(uid));
  expect(Object.keys(doc?.fields ?? {})).toEqual(['currentPlan']);
});
