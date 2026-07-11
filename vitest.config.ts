import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Mirror the tsconfig "@/*" -> "./*" path alias so unit tests import the same
// way the app does.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // `include` globs pull EVERY matching file into the report — even ones no
      // test imports — so an untested file surfaces as 0% instead of silently
      // vanishing. (Vitest 4 folded the old `all: true` behaviour into `include`;
      // the explicit key was removed from the type.)
      //
      // Scope to the surface vitest actually unit-tests. The app/ and components/
      // trees are React Server Components / client UI exercised by the Playwright
      // e2e suite (see e2e/), which V8 unit coverage can't attribute — including
      // them here would peg the report at ~28% regardless of unit-test quality.
      include: ['lib/**'],
      exclude: [
        '**/*.d.ts',
        // Firebase I/O layer (feature 006). Every function here is a thin
        // dynamic-`import('firebase/*')` wrapper: unit-testing it would only
        // assert that a mock was called, which is why the plan (research.md
        // R-10) puts its coverage in the emulator suite (e2e/auth/) instead.
        //
        // The logic worth testing was deliberately extracted into
        // lib/firebase/contracts/** — pure, firebase-free, and NOT excluded, so
        // the cross-platform write contracts stay pinned at 100% here.
        'lib/firebase/client.ts',
        'lib/firebase/config.ts',
        'lib/firebase/auth.ts',
        'lib/firebase/analytics.ts',
        'lib/firebase/userProfile.ts',
        'lib/firebase/progressSync.ts',
        'lib/firebase/entitlement.ts',
        // Same shape, feature 008: the pure logic is in
        // lib/firebase/contracts/learnerProfilePayload.ts; this is the I/O shell.
        'lib/firebase/learnerProfile.ts',
      ],
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      // Regression gate: `npm run test:coverage` (and CI) fail if coverage drops
      // below these. Pinned at/just under the numbers the suite currently hits
      // (lines & functions 100%, statements ~98%, branches ~83%) so a real drop
      // fails fast while a trivial refactor that adds one defensive branch won't.
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 97,
        branches: 80,
      },
    },
  },
});
