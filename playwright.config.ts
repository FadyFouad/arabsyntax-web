import { defineConfig, devices } from '@playwright/test';

// E2E config for the public site. Tests live in ./e2e and drive a real Next.js
// server (started automatically below). They are NOT run by `npm test` (vitest
// only globs test/**/*.test.ts) — run them with `npx playwright test`.
//
// First-time setup:
//   npm i -D @playwright/test
//   npx playwright install --with-deps chromium
//
// The site is locale-prefixed "as-needed": Arabic (default) is unprefixed (`/`,
// `/lessons`), English is under `/en` (`/en`, `/en/lessons`).

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Pin the browser language to Arabic (the site's default locale). With
    // localePrefix: 'as-needed' + next-intl locale detection, an `en` Accept-
    // Language makes the UNprefixed routes (`/`, `/lessons`) redirect to `/en`
    // and serve English — so without this, the Arabic-route assertions would be
    // testing English pages. Explicit `/en/...` routes still resolve to English.
    locale: 'ar',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Mobile viewport catches the responsive header/menu (MobileMenu.tsx). We use
    // Mobile CHROME (not iPhone/webkit) on purpose: the production CSP sends
    // `upgrade-insecure-requests`, and webkit (unlike chromium) has no localhost
    // carve-out, so over the http test server it upgrades every asset to https
    // and the whole page fails to load. Chromium exempts localhost, so the mobile
    // viewport + touch + MobileMenu are all exercised here without serving https.
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  // Build once, serve the production output — closer to what users hit than `dev`,
  // and exercises the static-export / SSG paths (generateStaticParams).
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
