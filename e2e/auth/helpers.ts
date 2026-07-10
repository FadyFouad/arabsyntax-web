import type { Page } from '@playwright/test';

/**
 * Emulator plumbing for the account-sync e2e suite.
 *
 * These tests exist because the cross-platform Firestore contracts
 * (specs/006-web-account-sync/contracts/) cannot be verified by a unit test: the
 * things that break the mobile app — a `createdAt` written as a string, a
 * `completed` map replaced wholesale, a dot-path key stored literally — are
 * properties of what Firestore actually stored, not of what our code passed in.
 *
 * So we read the documents back through the Firestore REST API, which returns
 * VALUE-TYPED JSON (`timestampValue` vs `stringValue`, `mapValue.fields`). That
 * typing is the assertion.
 */

export const PROJECT_ID = 'demo-arabsyntax';
export const AUTH_EMULATOR = 'http://127.0.0.1:9099';
export const FIRESTORE_EMULATOR = 'http://127.0.0.1:8080';

const DOCS = `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

// ─── Firestore typed-value JSON ──────────────────────────────────────────────

/** A Firestore REST value: exactly one of these keys is present. */
export interface FirestoreValue {
  stringValue?: string;
  timestampValue?: string;
  booleanValue?: boolean;
  nullValue?: null;
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

export interface FirestoreDoc {
  name?: string;
  fields?: Record<string, FirestoreValue>;
}

export const timestamp = (iso: string): FirestoreValue => ({ timestampValue: iso });
export const string = (value: string): FirestoreValue => ({ stringValue: value });
export const map = (fields: Record<string, FirestoreValue>): FirestoreValue => ({
  mapValue: { fields },
});

// ─── Emulator state ──────────────────────────────────────────────────────────

/** Wipe both emulators so every test starts from a known-empty project. */
export async function resetEmulators(): Promise<void> {
  await Promise.all([
    fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
      method: 'DELETE',
      headers: OWNER,
    }),
    fetch(`${DOCS}`, { method: 'DELETE', headers: OWNER }),
  ]);
}

/**
 * "One account per email address" (D-6) — the setting that makes a Google
 * sign-in on an Apple-registered email raise
 * `auth/account-exists-with-different-credential` instead of silently linking.
 */
export async function setOneAccountPerEmail(enabled: boolean): Promise<void> {
  await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/config`, {
    method: 'PATCH',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ signIn: { allowDuplicateEmails: !enabled } }),
  });
}

/** The uid of the only account in the emulator. Tests reset first, so there is exactly one. */
export async function onlyUid(): Promise<string> {
  const response = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:query`,
    { method: 'POST', headers: { ...OWNER, 'Content-Type': 'application/json' }, body: '{}' },
  );
  const body = (await response.json()) as { userInfo?: Array<{ localId: string }> };
  const users = body.userInfo ?? [];
  if (users.length !== 1) {
    throw new Error(`expected exactly 1 emulator account, found ${users.length}`);
  }
  return users[0]!.localId;
}

/** Strip a user's displayName, reproducing Apple's "name only on first consent" behavior. */
export async function clearDisplayName(uid: string): Promise<void> {
  await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:update`, {
    method: 'POST',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: uid, deleteAttribute: ['DISPLAY_NAME'] }),
  });
}

// ─── Firestore documents ─────────────────────────────────────────────────────

/** Create or overwrite a document. Used to plant app-written state before the web reads it. */
export async function seedDoc(path: string, fields: Record<string, FirestoreValue>): Promise<void> {
  const response = await fetch(`${DOCS}/${path}`, {
    method: 'PATCH',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error(`seedDoc ${path} failed: ${await response.text()}`);
}

/** Read a document back as typed JSON. Returns null when it does not exist. */
export async function readDoc(path: string): Promise<FirestoreDoc | null> {
  const response = await fetch(`${DOCS}/${path}`, { headers: OWNER });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`readDoc ${path} failed: ${await response.text()}`);
  return (await response.json()) as FirestoreDoc;
}

export const userDoc = (uid: string) => `users/${uid}`;
export const progressDoc = (uid: string) => `users/${uid}/progress/lesson_completion`;
export const purchasesDoc = (uid: string) => `purchases/${uid}`;

/** The `completed` map's entries, keyed by lessonId. */
export function completedFields(doc: FirestoreDoc | null): Record<string, FirestoreValue> {
  return doc?.fields?.completed?.mapValue?.fields ?? {};
}

/**
 * Compare timestamp values by INSTANT, not by string. The Firestore emulator
 * echoes a seeded `…T00:00:00.000Z` back as `…T00:00:00Z` — same moment, so a
 * string comparison would fail on formatting alone.
 */
export function sameInstant(actual: string | undefined, expectedIso: string): boolean {
  return !!actual && new Date(actual).getTime() === new Date(expectedIso).getTime();
}

// ─── Sign-in through the real UI ─────────────────────────────────────────────

export type Provider = 'google' | 'apple';

const PROVIDER_BUTTON: Record<Provider, RegExp> = {
  google: /Google/,
  apple: /Apple/,
};

/**
 * Drive the Auth Emulator's account widget to a filled, submitted new account.
 *
 * The widget always opens on a chooser ("No accounts… Add new account", or a
 * list when accounts exist) and only reveals the form after "Add new account".
 * That transition is occasionally dropped, and the widget reuses element ids
 * across its screens (multiple hidden `#email-input`s) — so this polls for the
 * VISIBLE form, re-clicking "Add new account" until it appears, then fills it.
 */
async function completeNewAccountForm(
  popup: import('@playwright/test').Page,
  account: { email: string; displayName?: string },
): Promise<void> {
  // The submit button exists ONLY on the form screen, so its visibility is the
  // one unambiguous "form is ready" signal — far more reliable than the reused
  // field ids, which appear on every screen and confuse `:visible` mid-transition.
  const submit = popup.getByRole('button', { name: /^Sign in with (Google|Apple)\.com$/ });
  const addNew = popup.getByText('Add new account', { exact: true });

  // The widget always opens on a chooser (even with zero accounts), so reveal the
  // form — retrying the reveal until the submit button shows, since the click is
  // occasionally dropped while the widget is still wiring up its handlers.
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await submit.isVisible().catch(() => false)) break;
    if (await addNew.isVisible().catch(() => false)) await addNew.click().catch(() => {});
    await submit.waitFor({ timeout: 4000 }).catch(() => {});
  }
  await submit.waitFor();

  // With the form confirmed up, the visible field is unambiguous; `.first()`
  // guards against a stale hidden duplicate lingering in the DOM.
  await popup.locator('#email-input:visible').first().fill(account.email);
  if (account.displayName) {
    await popup.locator('#display-name-input:visible').first().fill(account.displayName);
  }
  await submit.click();
  await popup.waitForEvent('close');
}

/**
 * Drive a full sign-in: open the header dialog, pick a provider, and complete
 * the Auth Emulator's account widget in the popup it opens.
 *
 * Deliberately goes through the buttons rather than calling `signInWithCredential`
 * from page context: the popup path, the profile upsert, and the analytics/marker
 * side effects are all part of what is under test.
 */
export async function signIn(
  page: Page,
  provider: Provider,
  account: { email: string; displayName?: string },
): Promise<void> {
  await page.getByRole('button', { name: /تسجيل الدخول|Sign in/ }).first().click();

  const popupPromise = page.waitForEvent('popup');
  // Scoped to the dialog: SaveProgressNudge renders the same provider buttons,
  // so an unscoped lookup is ambiguous whenever the nudge is on screen.
  await page.getByRole('dialog').getByRole('button', { name: PROVIDER_BUTTON[provider] }).click();
  const popup = await popupPromise;
  await completeNewAccountForm(popup, account);

  // The app runs its profile upsert INSIDE the sign-in promise, before it
  // attaches the auth listener that flips the UI to signed-in. So the avatar
  // appearing is proof the `users/{uid}` write already landed — every caller can
  // read the doc immediately after this returns without racing the upsert.
  await accountButton(page).waitFor();
}

/** Sign in again as an account the emulator already knows, by picking it from the list. */
export async function signInAsExisting(page: Page, provider: Provider, email: string): Promise<void> {
  await page.getByRole('button', { name: /تسجيل الدخول|Sign in/ }).first().click();

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('dialog').getByRole('button', { name: PROVIDER_BUTTON[provider] }).click();
  const popup = await popupPromise;

  await popup.getByText(email).waitFor();
  await popup.getByText(email).click();
  await popup.waitForEvent('close');
  await accountButton(page).waitFor();
}

/** The header avatar button, present only once auth has resolved to signed-in. */
export function accountButton(page: Page) {
  return page.getByRole('button', { name: /فتح قائمة الحساب|Open account menu/ });
}

export async function openAccountMenu(page: Page) {
  await accountButton(page).click();
  return page.getByRole('menu');
}

export async function signOut(page: Page): Promise<void> {
  await openAccountMenu(page);
  await page.getByRole('menuitem', { name: /تسجيل الخروج|Sign out/ }).click();
  await accountButton(page).waitFor({ state: 'detached' });
}
