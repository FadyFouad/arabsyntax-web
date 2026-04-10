# Quickstart: Legal Pages Verification

**Feature**: 003-legal-pages | **Date**: 2026-04-10

Run these checks after implementation to verify correctness.

---

## Prerequisites

```bash
cd arabsyntax-web
npm run dev
# Open http://localhost:3000
```

---

## Check 1: All Four URLs Load

Verify each URL returns a non-empty page with the correct heading:

| URL | Expected h1 |
|-----|-------------|
| `http://localhost:3000/privacy` | سياسة الخصوصية |
| `http://localhost:3000/en/privacy` | Privacy Policy |
| `http://localhost:3000/terms` | شروط الاستخدام |
| `http://localhost:3000/en/terms` | Terms of Service |

No 404 errors, no blank pages.

---

## Check 2: Dark Theme Prose Rendering

1. Navigate to `http://localhost:3000/privacy`.
2. **Expected**:
   - Body text uses `--color-text` (light, readable against dark background).
   - `<h2>` section headings are visible and styled.
   - Links use `--color-primary` (teal).
   - No hardcoded black or white background on prose text.
   - Bullet lists render with correct indentation.
3. Open DevTools → Elements. Inspect the `<article>` element — it should have the `prose` class.

---

## Check 3: RTL Prose (Arabic)

1. Navigate to `http://localhost:3000/privacy`.
2. **Expected**:
   - Text flows right-to-left throughout the article.
   - List bullets appear on the right side of list items.
   - `<h2>` headings are right-aligned.
   - Line height is visibly more generous than the English version (1.8 vs 1.7).
3. Navigate to `http://localhost:3000/en/privacy` and compare — text and bullets flip to LTR.

---

## Check 4: "Last Updated" Date

1. On any legal page, verify a "آخر تحديث: 2026-04-10" (Arabic) or "Last updated: 2026-04-10" (English) line appears below the `<h1>`.
2. Open `content/legal/privacy.ar.mdx` and change `lastUpdated` to a different date.
3. **Expected**: After saving, the dev server hot-reloads and the new date appears on the page — confirming one-edit-per-document update flow.
4. Revert the change.

---

## Check 5: Privacy Policy Content Accuracy

On `http://localhost:3000/privacy`, verify the policy contains all required disclosures:

- [ ] Anonymous user ID via Firebase (no personal information collected)
- [ ] Entitlement records stored by anonymous ID
- [ ] In-app purchases processed by Google Play / Apple (app does not see payment data)
- [ ] Ads via Google AdMob; EEA users see a consent form before personalized ads
- [ ] Audio files cached locally on device (nothing uploaded)
- [ ] No access to contacts, photos, location, or microphone
- [ ] Children's Privacy section present and mentions parental contact option
- [ ] Contact section with developer email address

---

## Check 6: Terms of Service Content Accuracy

On `http://localhost:3000/terms`, verify the terms contain all required clauses:

- [ ] Acceptance of Terms
- [ ] Personal, non-commercial license
- [ ] Subscriptions and billing defers to Google Play / Apple
- [ ] Legacy Purchasers clause — clearly states one-time buyers keep all premium features permanently
- [ ] Disclaimer of Warranties
- [ ] Limitation of Liability
- [ ] Governing Law (Egyptian law)
- [ ] Contact information

---

## Check 7: Footer Links

1. On `http://localhost:3000` (Arabic landing page), scroll to footer.
2. **Expected**: Footer Legal column contains "سياسة الخصوصية" and "شروط الاستخدام" as links.
3. Click "سياسة الخصوصية" → navigates to `/privacy`.
4. Click "شروط الاستخدام" → navigates to `/terms`.
5. Repeat on `http://localhost:3000/en`:
   - "Privacy Policy" → `/en/privacy`
   - "Terms of Service" → `/en/terms`

---

## Check 8: Public Accessibility (Google Play Console)

1. Build and deploy to Vercel (or run `npm run build && npm run start`).
2. Open `https://arabsyntax.com/privacy` in an incognito window.
3. **Expected**: Page loads without login, visible to search engines.
4. In Google Play Console → App content → Privacy policy, enter the URL.
5. **Expected**: Google Play Console accepts the URL (no "URL not reachable" error).

---

## Check 9: No noindex

1. View page source of `/privacy`.
2. **Expected**: No `<meta name="robots" content="noindex">` tag.
3. Verify the `<head>` contains correct `<title>` and `<meta name="description">`.

---

## Check 10: Responsiveness

Resize from 320px to 1920px on `/privacy`.

- At 320px: no horizontal scroll, text wraps correctly, line length is comfortable.
- At 1024px: prose is centered with comfortable max-width (~65–75 characters per line).
- At 1920px: prose remains centered, does not stretch full-width.

---

## Check 11: Lighthouse Accessibility

1. Open Chrome → DevTools → Lighthouse.
2. Run on `http://localhost:3000/privacy`:
   - **Accessibility**: target ≥ 95
3. Run on `http://localhost:3000/en/privacy` with same target.
4. Common issues to watch for:
   - Missing `lang` attribute on `<html>` (handled by locale layout)
   - Insufficient color contrast in prose body text
   - Heading levels skipped inside MDX content

---

## Common Issues

| Symptom | Likely Cause |
|---------|-------------|
| `Module not found: @/content/legal/privacy.ar.mdx` | `pageExtensions` not updated in `next.config.ts`, or `withMDX` not wrapped |
| Prose text is black on white (not dark theme) | `@plugin "@tailwindcss/typography"` not added to globals.css, or `--tw-prose-body` override missing |
| List bullets on wrong side in Arabic | `[dir="rtl"]` on `<html>` correct, but browser reset CSS interfering — check that prose uses logical properties |
| Footer links go to wrong locale | Using `<a href="/privacy">` instead of next-intl `<Link href="/privacy">` |
| `frontmatter` is `undefined` in page | MDX file exports `frontmatter` but page imports it without the named export syntax |
