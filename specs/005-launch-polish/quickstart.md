# Quickstart: Launch Polish Verification

**Branch**: `005-launch-polish` | **Date**: 2026-04-12
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

This is the manual verification procedure for the Launch Polish feature.
Run every step before marking the feature done. Any failure is a
blocker.

## Prerequisites

- Features 001–004 landed and committed.
- `npm install` has run cleanly since the last `package.json` change.
- Environment variables for `RESEND_API_KEY`, `SUPPORT_EMAIL`, and (if
  testing rate limits) `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN` are set in `.env.local`. Missing vars
  should fall back gracefully after this feature (see Decision 12 in
  `research.md`).

## Step 1 — Brand-rename grep gate (AUTOMATED)

From repo root (`arabsyntax-web/`):

```bash
# User-visible English brand
grep -rn "ArabSyntax" \
  --include="*.ts" --include="*.tsx" \
  --include="*.json" --include="*.mdx" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.next \
  --exclude-dir="005-launch-polish" \
  . | grep -v "com.etateck.arabsyntax"

# User-visible Arabic brand
grep -rn "النحو العربي" \
  --include="*.ts" --include="*.tsx" \
  --include="*.json" --include="*.mdx" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.next \
  --exclude-dir="005-launch-polish" \
  .
```

**Expected**: Both commands return **zero lines**.

**Allowed exceptions** (explicitly excluded above):

- `com.etateck.arabsyntax` inside `siteConfig.stores.googlePlay` — the
  Android package ID is the real infrastructure identifier (FR-004).
- `specs/005-launch-polish/**` — the spec docs reference the old brand
  to describe what was replaced. Excluded by directory.
- `.next/**`, `node_modules/**` — build artifacts and vendor code.

**Also allowed** (not matched by the grep above, no action needed):

- The project folder name `arabsyntax-web` (not user-visible).
- Git history and commit messages (not user-visible).

## Step 2 — Forbidden Tailwind utilities (AUTOMATED)

```bash
grep -rn -E "(^|[^a-z-])(pl-|pr-|ml-|mr-|left-|right-|text-left|text-right)" \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=.next \
  components/ app/
```

**Expected**: Zero matches. Constitution §I forbids physical direction
utilities in RTL-aware code. Use `ps-*`, `pe-*`, `ms-*`, `me-*`,
`start-*`, `end-*`, `text-start`, `text-end`.

## Step 3 — Type check + build

```bash
npm run lint
npm run build
```

**Expected**: Both exit 0. Any type error in a consumer of
`siteConfig`, `featureFlags`, or `StructuredData` is a blocker — the
literal types exist to catch typos at build time.

## Step 4 — Dev server smoke test

```bash
npm run dev
```

Then open each route in a browser:

| # | URL | Locale | Dir | Must show |
|---|---|---|---|---|
| 1 | http://localhost:3000/ | ar | rtl | Hero: "النحو الكافي"; eyebrow "تعلَّم النحو العربي"; social proof "★ ٤٫٧ · أكثر من ٢٬٦٠٠ تقييم على Google Play"; FreeCallout section (no Pricing); Audiences with two balanced cards |
| 2 | http://localhost:3000/en | en | ltr | Hero: "Al-Nahw Al-Kafi"; eyebrow "Learn Arabic Grammar"; social proof "★ 4.7 · 2,600+ reviews on Google Play"; FreeCallout section (no Pricing); Audiences with two balanced cards |
| 3 | http://localhost:3000/privacy | ar | rtl | Rewritten Arabic privacy policy; 9 sections; mentions App activity / App info and performance / Device or other IDs; `fady.fouad.a@gmail.com` contact |
| 4 | http://localhost:3000/en/privacy | en | ltr | Same structure in English |
| 5 | http://localhost:3000/terms | ar | rtl | Rewritten Arabic terms; no subscriptions/refunds/legacy-purchasers language |
| 6 | http://localhost:3000/en/terms | en | ltr | Same structure in English |
| 7 | http://localhost:3000/support | ar | rtl | Support page unchanged from Feature 004, except brand form in metadata/footer |
| 8 | http://localhost:3000/en/support | en | ltr | Same |

## Step 5 — Header & footer checks (both locales, both routes)

For `/` and `/en`:

- **Header brand text** reads the correct locale-specific brand form.
- **Header nav** contains Features, How It Works, Audiences, FAQ —
  and **NOT Pricing**.
- **Footer brand** reads the correct locale-specific brand form.
- **Footer copyright** reads:
  - EN: `© 2026 ETA TECH. All rights reserved.`
  - AR: `© ٢٠٢٦ ETA TECH. جميع الحقوق محفوظة.`
- **Footer Product column** contains Features, How It Works,
  Audiences, FAQ — and **NOT Pricing**.
- **Footer Legal column** still links to Privacy and Terms.

## Step 6 — Pricing flag restoration test

Temporarily flip `lib/featureFlags.ts` to `showPricing: true`, reload
`/`, and verify:

- Pricing section renders where FreeCallout was.
- Pricing nav link reappears in the header.
- Pricing link reappears in the Footer Product column.

**Revert the flag to `false` before committing.** The default for this
feature is OFF.

## Step 7 — View-source checks

For `/` and `/en`, view page source (not DevTools Elements — raw HTML)
and confirm:

1. `<title>` contains the locale-specific brand form.
2. `<meta name="description">` mentions "4.7" and both audiences.
3. `<link rel="alternate" hreflang="ar">` and
   `<link rel="alternate" hreflang="en">` both present.
4. `<link rel="canonical">` uses `siteConfig.url`.
5. `<meta property="og:title">`, `<meta property="og:description">`,
   `<meta property="og:image">`, `<meta property="og:locale">` present.
6. `<script type="application/ld+json">` block contains a
   `SoftwareApplication` with:
   - `name: "Al-Nahw Al-Kafi"` (or Arabic on `/`)
   - `alternateName` showing the other locale's form
   - `operatingSystem: "ANDROID, IOS"`
   - `applicationCategory: "EducationalApplication"`
   - `offers.price: "0"` / `priceCurrency: "USD"`
   - `aggregateRating.ratingValue: "4.7"` / `reviewCount: "2600"`
   - `installUrl` array with Google Play + App Store URLs
   - `author.@type: "Organization"` / `name: "ETA TECH"`

## Step 8 — `app/sitemap.ts` and `app/robots.ts`

- `http://localhost:3000/sitemap.xml` returns an XML sitemap listing
  every primary route in both locales:
  `/`, `/en`, `/privacy`, `/en/privacy`, `/terms`, `/en/terms`,
  `/support`, `/en/support`. Each URL uses the canonical
  `siteConfig.url` host, not `localhost` in production. Each entry
  includes `xhtml:link rel="alternate" hreflang="..."` for the other
  locale.
- `http://localhost:3000/robots.txt` returns a plain-text robots file
  that allows all user agents and points `Sitemap:` at
  `${siteConfig.url}/sitemap.xml`.

## Step 9 — JSON-LD validation

Paste the rendered HTML of `/en` into Google's Rich Results Test
(https://search.google.com/test/rich-results) and confirm:

- `SoftwareApplication` is detected.
- `AggregateRating` is detected.
- `Offer` is detected.
- Zero errors, zero warnings. (Warnings about missing optional fields
  like `screenshot` are acceptable if documented in `LAUNCH_TODO.md`.)

## Step 10 — Open Graph preview

Paste the deployed URL (or use a local tunnel like `ngrok`) into
https://www.opengraph.xyz/ and verify:

- OG title shows the new brand form.
- OG description mentions both audiences and the rating.
- OG image loads. **If the image still shows the old brand**, that is
  acceptable **only if** the exception is recorded in `LAUNCH_TODO.md`
  per Decision 10 in `research.md`.

## Step 11 — Privacy policy parity with Google Play

Open the live Google Play listing for `com.etateck.arabsyntax` in a
separate tab, expand the Data Safety section, and diff it line-by-line
against `http://localhost:3000/privacy` (and `/en/privacy`):

| Play Store claim | Must appear in privacy policy |
|---|---|
| Developer does not collect data | Yes, Section 2 |
| Shared: App activity | Yes, Section 3, same wording |
| Shared: App info and performance | Yes, Section 3, same wording |
| Shared: Device or other IDs | Yes, Section 3, same wording |
| Data is not encrypted in transit | Yes, Section 4, honest disclosure |
| Data cannot be deleted on request | Yes, Section 5, honest disclosure |
| Suitable for all ages | Yes, Section 6, children's privacy |

Any divergence is a compliance bug. Fix in the same PR.

## Step 12 — Terms of service forbidden-terms check

```bash
grep -rnEi "(subscription|subscribe|refund|billing|premium|legacy purchaser|monthly plan|yearly plan|lifetime)" \
  content/legal/terms.*.mdx
```

**Expected**: Zero matches. The app is free; these concepts do not
apply.

## Step 13 — FAQ content check

Manually verify that the FAQ on `/` and `/en` contains:

- Q: Is Al-Nahw Al-Kafi free? → A: Yes, free on both stores, no
  subscriptions, no IAP.
- Q: Which platforms? → Google Play + App Store.
- Q: Suitable for beginners? → Yes, all levels.
- Q: Covers Thanaweya Amma? → Yes.
- Q: Offline use? → (TODO placeholder acceptable if flagged in
  `LAUNCH_TODO.md`).
- Q: How to contact support? → Support form + email.
- Q: Does the app collect personal info? → No developer collection;
  reference privacy policy.

**Removed** (must not appear): pricing tiers, free vs. premium, legacy
purchasers, iOS availability date.

## Step 14 — Lighthouse audit

In Chrome DevTools → Lighthouse (or `npx lighthouse`), run a mobile
audit on `/` and `/en`. All four categories must score **≥ 95**:

- Performance
- Accessibility
- Best Practices
- SEO

Any regression from Feature 004 baseline (which passed these gates) is
a blocker. If SEO dropped because of a JSON-LD error, fix the error —
do not disable the script.

## Step 15 — Resend sender check (optional, if testing email)

Submit the support form on `/support` or `/en/support`. Verify the
received email:

- `From:` name reads "Al-Nahw Al-Kafi Support" (not "ArabSyntax").
- `Reply-To:` is `fady.fouad.a@gmail.com` (from `siteConfig`).
- Subject contains the new brand form.

## Step 16 — Commit

When every step above passes, commit with:

```text
refactor: rebrand to Al-Nahw Al-Kafi and align content with live app
```

Do not split the commit. The feature is an atomic content pass —
partial commits create intermediate states where some pages show the
old brand and some show the new, which is worse than either endpoint.

## Blocker Summary

A feature is **done** only when:

1. Both greps in Step 1 return zero lines.
2. Grep in Step 2 returns zero lines.
3. `npm run build` exits 0.
4. All 8 routes in Step 4 render the expected content.
5. Header/footer checks in Step 5 pass for both locales.
6. Flag-flip test in Step 6 passes both directions.
7. View-source in Step 7 confirms metadata, hreflang, canonical,
   OG tags, and JSON-LD on every primary route.
8. `sitemap.xml` and `robots.txt` return valid content in Step 8.
9. Rich Results Test in Step 9 reports zero errors.
10. OG preview in Step 10 shows new brand (or OG image defer is
    recorded in `LAUNCH_TODO.md`).
11. Privacy policy matches Play Store Data Safety in Step 11.
12. Terms grep in Step 12 returns zero matches.
13. FAQ content in Step 13 matches the approved list.
14. Lighthouse ≥ 95 in all four categories on both primary routes.

Any "not yet" → not done. Fix, re-run the affected step, proceed.
