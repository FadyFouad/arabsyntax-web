import { test, expect } from '@playwright/test';

// The contact form is the only interactive, side-effecting surface. These tests
// cover client-side validation (no network needed), the disabled/submitting
// state, and the success/error UI by intercepting the Server Action response so
// the suite runs without real Resend/Upstash credentials.
//
// Next Server Actions POST back to the same URL with a `next-action` header. We
// fulfill those requests with a synthetic React-Flight payload representing the
// action's return value, so we control success vs. each error branch.

const SUPPORT = '/en/support';

// The form's error region is role="alert". Next.js also renders an always-present
// EMPTY role="alert" route-announcer (#__next-route-announcer__), so a bare
// getByRole('alert') is ambiguous (strict-mode violation). Filter to the alert
// that actually carries text — that's ours.
function formAlert(page: import('@playwright/test').Page) {
  return page.getByRole('alert').filter({ hasText: /\S/ });
}

async function fillValid(page: import('@playwright/test').Page) {
  await page.getByLabel(/name/i).fill('Sara Ahmed');
  await page.getByLabel(/email/i).fill('sara@example.com');
  await page.getByLabel(/subject/i).fill('A question about lessons');
  await page.getByLabel(/message/i).fill('I would like more detail on the audio lessons.');
}

// Build a Flight response that resolves the action's return value to `value`.
// Captured from a live Next 16 server-action response: row 0 is a wrapper whose
// `a` field is a LAZY REFERENCE (`$@1`) to row 1, and row 1 holds the actual
// return value. Putting the value in row 0 (as a naive `0:<json>` would) makes
// the client resolve the result to `undefined`, so the success/error UI never
// renders. This shape is what the React Flight client actually parses.
function flight(value: unknown): string {
  return `0:{"a":"$@1","f":"","b":""}\n1:${JSON.stringify(value)}\n`;
}

async function mockAction(page: import('@playwright/test').Page, value: unknown) {
  await page.route(SUPPORT, async (route) => {
    const req = route.request();
    if (req.method() === 'POST' && req.headers()['next-action']) {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/x-component' },
        body: flight(value),
      });
      return;
    }
    await route.continue();
  });
}

test.describe('contact form — client validation (no submission)', () => {
  test('shows field errors and does NOT submit when empty', async ({ page }) => {
    let posted = false;
    page.on('request', (r) => {
      if (r.method() === 'POST') posted = true;
    });
    await page.goto(SUPPORT);
    await page.getByRole('button', { name: /send|submit/i }).click();
    // react-hook-form + zodResolver block submission and render inline errors.
    await expect(page.getByText(/required/i).first()).toBeVisible();
    expect(posted, 'must not POST when client validation fails').toBe(false);
  });

  test('rejects a malformed email before submitting', async ({ page }) => {
    await page.goto(SUPPORT);
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/name/i).fill('Sara');
    await page.getByRole('button', { name: /send|submit/i }).click();
    await expect(page.getByText(/valid email|emailInvalid|invalid/i).first()).toBeVisible();
  });

  test('rejects a too-short message', async ({ page }) => {
    await page.goto(SUPPORT);
    await page.getByLabel(/message/i).fill('hi');
    await page.getByLabel(/name/i).fill('Sara');
    await page.getByRole('button', { name: /send|submit/i }).click();
    await expect(page.getByText(/messageMin|at least|short/i).first()).toBeVisible();
  });
});

test.describe('contact form — submission outcomes (mocked action)', () => {
  test('happy path shows the success panel', async ({ page }) => {
    await mockAction(page, { success: true });
    await page.goto(SUPPORT);
    await fillValid(page);
    await page.getByRole('button', { name: /send|submit/i }).click();
    await expect(page.getByRole('status')).toBeVisible();
    // The "send another" reset button appears in the success state.
    await expect(page.getByRole('button', { name: /another/i })).toBeVisible();
  });

  test('rate_limited shows the rate-limit error alert', async ({ page }) => {
    await mockAction(page, { success: false, error: 'rate_limited' });
    await page.goto(SUPPORT);
    await fillValid(page);
    await page.getByRole('button', { name: /send|submit/i }).click();
    await expect(formAlert(page)).toBeVisible();
  });

  test('send_failed shows the generic failure alert', async ({ page }) => {
    await mockAction(page, { success: false, error: 'send_failed' });
    await page.goto(SUPPORT);
    await fillValid(page);
    await page.getByRole('button', { name: /send|submit/i }).click();
    await expect(formAlert(page)).toBeVisible();
  });

  test('double-click does not fire two submissions (button disables while submitting)', async ({
    page,
  }) => {
    let count = 0;
    await page.route(SUPPORT, async (route) => {
      const req = route.request();
      if (req.method() === 'POST' && req.headers()['next-action']) {
        count += 1;
        await new Promise((r) => setTimeout(r, 400)); // hold the action open
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'text/x-component' },
          body: flight({ success: true }),
        });
        return;
      }
      await route.continue();
    });
    await page.goto(SUPPORT);
    await fillValid(page);
    const btn = page.getByRole('button', { name: /send|submit/i });
    await btn.click();
    await btn.click({ force: true }).catch(() => {}); // 2nd click while disabled
    await expect(page.getByRole('status')).toBeVisible();
    expect(count, 'concurrent double-submit must not double-send').toBe(1);
  });
});

test('honeypot field is present but visually hidden from users', async ({ page }) => {
  await page.goto(SUPPORT);
  const honeypot = page.locator('input[name="website"]');
  await expect(honeypot).toHaveCount(1);
  await expect(honeypot).not.toBeInViewport();
});
