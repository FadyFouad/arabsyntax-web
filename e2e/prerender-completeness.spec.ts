import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// SSG PRERENDER COMPLETENESS.
//
// generateStaticParams() prerenders one page per lesson/i3rab slug. A regression
// here ships a 404/500 for content that exists — exactly the production bug in
// PR #19 ("removed dynamicParams=false — broke prerendered detail pages"). The
// rest of the suite only checks that UNKNOWN slugs 404; this checks that every
// KNOWN slug actually renders.
//
// Slugs are derived from the SAME sources the loaders read (manifest.json for
// lessons, the content/i3rab/ar dir for i3rab) so this test and the loaders can
// never silently disagree — content-integrity.test.ts already guarantees those
// files are valid and slug===filename.
//
// Scoped to chromium so the (large) sweep runs once, not per browser project.
// ─────────────────────────────────────────────────────────────────────────────

// The conditional-skip callback form `test.skip(({}, testInfo) => ...)` does NOT
// receive testInfo (only fixtures), so it throws. A beforeEach hook DOES get
// testInfo — this is the supported way to skip a whole file by project.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'prerender sweep runs once on chromium');
});

const ROOT = process.cwd();

const lessonSlugs: string[] = Object.keys(
  JSON.parse(readFileSync(path.join(ROOT, 'content', 'lessons', 'manifest.json'), 'utf8')).en,
);

const i3rabSlugs: string[] = readdirSync(path.join(ROOT, 'content', 'i3rab', 'ar'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5));

// Sanity: if the content dirs ever come back empty, fail loudly rather than
// silently "passing" a zero-iteration sweep.
test('content sources are non-empty (sweep would be meaningless otherwise)', () => {
  expect(lessonSlugs.length).toBeGreaterThan(0);
  expect(i3rabSlugs.length).toBeGreaterThan(0);
});

async function expectRendered(page: import('@playwright/test').Page, url: string) {
  const res = await page.goto(url);
  expect(res?.status(), `HTTP status for ${url}`).toBe(200);
  // Not a soft-404: a real detail page renders an <h1> with content.
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1, `h1 missing on ${url}`).toBeVisible();
  expect((await h1.textContent())?.trim().length, `empty h1 on ${url}`).toBeGreaterThan(0);
}

// Lessons resolve through two distinct code paths (AR source vs. EN overlay),
// each prerendered separately — so both locales are swept in full.
test.describe('every lesson slug prerenders (ar + en)', () => {
  for (const slug of lessonSlugs) {
    test(`/lessons/${slug}`, async ({ page }) => {
      await expectRendered(page, `/lessons/${slug}`);
    });
    test(`/en/lessons/${slug}`, async ({ page }) => {
      await expectRendered(page, `/en/lessons/${slug}`);
    });
  }
});

// i3rab content is identical Arabic on both locales (same component), so the AR
// route is swept in full and the EN route is spot-checked for the routing wiring.
test.describe('every i3rab slug prerenders (ar)', () => {
  for (const slug of i3rabSlugs) {
    test(`/i3rab/${slug}`, async ({ page }) => {
      await expectRendered(page, `/i3rab/${slug}`);
    });
  }
});

test('i3rab EN route is wired (spot-check)', async ({ page }) => {
  await expectRendered(page, `/en/i3rab/${i3rabSlugs[0]}`);
});

// Paged matns (manifest `paged: true`) serve one page per باب, keyed by the
// باب's first verse id, the same rule as lib/mutun/units.ts. Every باب page is
// swept on AR. The matn URL stays as the باب index.
const mutunManifest = JSON.parse(readFileSync(path.join(ROOT, 'content', 'mutun', 'manifest.json'), 'utf8')) as {
  mutun: { id: string; paged?: boolean }[];
};
const pagedUnitPaths: string[] = mutunManifest.mutun
  .filter((m) => m.paged === true)
  .flatMap((m) => {
    const matn = JSON.parse(readFileSync(path.join(ROOT, 'content', 'mutun', `${m.id}.json`), 'utf8')) as {
      units: { order: number; body: { sections: { type: string; id?: string }[] } }[];
    };
    return [...matn.units]
      .sort((a, b) => a.order - b.order)
      .map((u) => u.body.sections.find((s) => s.type === 'verse' && s.id)?.id)
      .filter((slug): slug is string => !!slug)
      .map((slug) => `/mutun/${m.id}/${slug}`);
  });

test.describe('every باب of a paged matn prerenders (ar)', () => {
  test('there are باب pages to sweep', () => {
    expect(pagedUnitPaths.length).toBeGreaterThan(0);
  });

  for (const url of pagedUnitPaths) {
    test(url, async ({ page }) => {
      await expectRendered(page, url);
    });
  }

  test('the paged matn URL is its باب index, linking every باب', async ({ page }) => {
    const id = pagedUnitPaths[0].split('/')[2];
    await expectRendered(page, `/mutun/${id}`);
    const links = page.locator(`nav a[href*="/mutun/${id}/"]`);
    await expect(links).toHaveCount(pagedUnitPaths.length);
  });

  test('a باب URL under a single-page matn is a 404', async ({ page }) => {
    const single = mutunManifest.mutun.find((m) => m.paged !== true)!;
    const res = await page.goto(`/mutun/${single.id}/alfiyya_0001`);
    expect(res?.status()).toBe(404);
  });
});
