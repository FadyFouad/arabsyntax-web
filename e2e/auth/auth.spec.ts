import { test, expect } from '@playwright/test';
import {
  accountButton,
  clearDisplayName,
  onlyUid,
  openAccountMenu,
  readDoc,
  resetEmulators,
  seedDoc,
  signIn,
  signInAsExisting,
  signOut,
  string,
  userDoc,
} from './helpers';

// US1 — one account across app and web.
// Contract: specs/006-web-account-sync/contracts/firestore-user-doc.md

test.beforeEach(async () => {
  await resetEmulators();
});

test('signing in creates users/{uid} with the shape the app can read', async ({ page }) => {
  await page.goto('/');
  await signIn(page, 'google', { email: 'sara@example.com', displayName: 'Sara' });

  await expect(accountButton(page)).toBeVisible();

  const doc = await readDoc(userDoc(await onlyUid()));
  const fields = doc?.fields ?? {};

  expect(fields.email?.stringValue).toBe('sara@example.com');
  expect(fields.displayName?.stringValue).toBe('Sara');
  // Lowercase, matching the app's AuthProvider enum value.
  expect(fields.provider?.stringValue).toBe('google');

  // The app's reader hard-casts these `as Timestamp?`. A `stringValue` here
  // would permanently break its profile read for this user (audit BL-4).
  expect(fields.createdAt?.timestampValue).toBeTruthy();
  expect(fields.createdAt?.stringValue).toBeUndefined();
  expect(fields.lastSignInAt?.timestampValue).toBeTruthy();
  expect(fields.lastSignInAt?.stringValue).toBeUndefined();

  // Server-owned keys: the rules reject any write that touches them.
  expect(fields.reengagementPushCount).toBeUndefined();
  expect(fields.lastReengagementPushAt).toBeUndefined();

  // Null omission (C-1): a null would erase the field under a merge write.
  for (const value of Object.values(fields)) {
    expect(value.nullValue).toBeUndefined();
  }
});

test('a second sign-in preserves createdAt and an app-written displayName', async ({ page }) => {
  // Apple hands back the display name only on the FIRST consent. Every later
  // sign-in must leave the stored name alone rather than merge a null over it.
  await page.goto('/');
  await signIn(page, 'apple', { email: 'omar@example.com' });

  const uid = await onlyUid();
  const first = await readDoc(userDoc(uid));
  const createdAt = first?.fields?.createdAt?.timestampValue;
  expect(createdAt).toBeTruthy();
  expect(first?.fields?.provider?.stringValue).toBe('apple');

  // Stand in for a name the app wrote (or that Apple supplied on first consent).
  await seedDoc(userDoc(uid), {
    ...first!.fields!,
    displayName: string('Omar from the app'),
  });

  // The credential now carries no name at all — Apple's second-consent behavior.
  await clearDisplayName(uid);

  await signOut(page);
  await signInAsExisting(page, 'apple', 'omar@example.com');
  await expect(accountButton(page)).toBeVisible();

  // The re-sign-in's profile upsert is driven by the popup credential resolving,
  // which can land just after the avatar appears (the avatar is driven by the
  // auth-state listener). Poll for lastSignInAt to advance — that is the proof
  // the upsert ran on the SECOND sign-in, so the preservation checks below are
  // about a real merge write, not a no-op.
  const firstMillis = new Date(first!.fields!.lastSignInAt!.timestampValue!).getTime();
  await expect
    .poll(async () => {
      const doc = await readDoc(userDoc(uid));
      const value = doc?.fields?.lastSignInAt?.timestampValue;
      return value ? new Date(value).getTime() : 0;
    })
    .toBeGreaterThan(firstMillis);

  const second = await readDoc(userDoc(uid));
  // The two things the app's reader depends on across a nameless re-sign-in: the
  // app-written name survived the merge (C-1 null-omission), and createdAt was
  // not overwritten (written once in the document's life).
  expect(second?.fields?.displayName?.stringValue).toBe('Omar from the app');
  expect(second?.fields?.createdAt?.timestampValue).toBe(createdAt);
});

test('signing out writes lastSignOutAt and clears the session', async ({ page }) => {
  await page.goto('/');
  await signIn(page, 'google', { email: 'sara@example.com', displayName: 'Sara' });
  const uid = await onlyUid();

  expect((await readDoc(userDoc(uid)))?.fields?.lastSignOutAt).toBeUndefined();

  await signOut(page);

  const doc = await readDoc(userDoc(uid));
  expect(doc?.fields?.lastSignOutAt?.timestampValue).toBeTruthy();

  // The marker is what a page load consults; without it, Firebase never loads.
  expect(await page.evaluate(() => localStorage.getItem('arabsyntax-auth'))).toBeNull();
});

test('the account menu shows the display name from the auth session', async ({ page }) => {
  await page.goto('/');
  await signIn(page, 'google', { email: 'sara@example.com', displayName: 'Sara' });

  const menu = await openAccountMenu(page);
  // C-4: read from the session, never from the Firestore `provider` field.
  await expect(menu).toContainText('Sara');
});

test('a signed-out page load makes zero auth/firestore requests and sets no cookies', async ({
  page,
  context,
}) => {
  // FR-4 / SC-7. This is the invariant the whole lazy-bootstrap design exists to
  // protect: no marker in localStorage → no Firebase code, no Firebase traffic.
  const firebaseRequests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (
      url.includes(':9099') ||
      url.includes(':8080') ||
      url.includes('identitytoolkit') ||
      url.includes('firestore.googleapis.com') ||
      url.includes('firebaseinstallations') ||
      url.includes('google-analytics') ||
      url.includes('googletagmanager')
    ) {
      firebaseRequests.push(url);
    }
  });

  await page.goto('/lessons/elm_alnaho');
  await page.waitForLoadState('networkidle');

  expect(firebaseRequests).toEqual([]);
  expect(await context.cookies()).toEqual([]);

  // And the SDK was never even evaluated.
  expect(await page.evaluate(() => Object.keys(window).some((k) => k.startsWith('__firebase')))).toBe(
    false,
  );
});

test('a returning visitor with the marker restores their session', async ({ page }) => {
  await page.goto('/');
  await signIn(page, 'google', { email: 'sara@example.com', displayName: 'Sara' });
  await expect(accountButton(page)).toBeVisible();

  await page.reload();

  // Firebase's own persistence restores the session; the marker is what tells us
  // it is worth loading the SDK to find out.
  await expect(accountButton(page)).toBeVisible();
});
