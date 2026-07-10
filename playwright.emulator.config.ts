import { defineConfig, devices } from '@playwright/test';

/**
 * E2E for web accounts (feature 006). Separate from playwright.config.ts because
 * this suite needs a DIFFERENT BUILD of the site — one with
 * `NEXT_PUBLIC_WEB_ACCOUNTS=true` baked in — plus the Firebase Emulator Suite.
 *
 * The public-site suite deliberately keeps building with the flag OFF, so it
 * keeps proving that the thing we actually ship today is unchanged.
 *
 * Requires a JDK ≥ 21 on PATH (the Firestore emulator is a Java process). Run:
 *   npm run test:e2e:auth
 *
 * Both suites run `next build` into the same .next directory, so they must not
 * run concurrently — hence the distinct port and the separate CI step.
 */

const PORT = Number(process.env.E2E_AUTH_PORT ?? 3101);
const baseURL = `http://localhost:${PORT}`;

// Any values work: a `demo-` project id keeps the SDK from ever reaching a real
// Firebase backend, and the emulator does not validate the API key.
const firebaseEnv = {
  NEXT_PUBLIC_WEB_ACCOUNTS: 'true',
  NEXT_PUBLIC_FIREBASE_EMULATORS: 'true',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-arabsyntax.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-arabsyntax',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:1:web:demo',
};

export default defineConfig({
  testDir: './e2e/auth',
  // Emulator state is global (one project, one account list), so the specs reset
  // it between tests. That makes them mutually exclusive by construction.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // Driving Firebase `signInWithPopup` through the Auth Emulator's widget is
  // inherently flaky in headless Chromium — window-focus races, cold first
  // connections to the emulators, and the widget's duplicate-id DOM. The app
  // logic is deterministic (the Vitest contract suite covers it); these tests
  // verify the real Firestore writes, so retries are the right mitigation for
  // transport flakiness rather than a smell to chase. Retries locally too.
  retries: 2,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Matches playwright.config.ts: Arabic is the default, unprefixed locale.
    locale: 'ar',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npx firebase emulators:start --only auth,firestore --project demo-arabsyntax',
      // The hub, not the auth port: it comes up last, so it means "all ready".
      url: 'http://127.0.0.1:4400/emulators',
      reuseExistingServer: !process.env.CI,
      // First run downloads the Firestore emulator jar.
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npm run build && npx next start -p ${PORT}`,
      url: baseURL,
      // Locally, reuse a flag-on server already on the port (fast iteration); CI
      // always builds fresh. Matches the public suite and the emulator server.
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: firebaseEnv,
    },
  ],
});
