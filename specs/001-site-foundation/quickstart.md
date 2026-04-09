# Quickstart: Site Foundation Verification

**Feature**: 001-site-foundation | **Date**: 2026-04-10

Use this guide to verify the foundation is correctly implemented after each
task is completed. Run these checks in order.

---

## Prerequisites

```bash
# Install dependencies (from arabsyntax-web/ root)
npm install

# Start dev server
npm run dev
```

The dev server runs on `http://localhost:3000` by default.

---

## Check 1: Arabic Default (Root URL)

1. Open a new browser tab and navigate to `http://localhost:3000`.
2. **Expected**:
   - Page direction is RTL (text flows right to left).
   - `<html>` element has `lang="ar"` and `dir="rtl"` (check in DevTools).
   - All navigation labels are in Arabic (المميزات، الأسعار، الأسئلة الشائعة، الدعم).
   - Footer headings and links are in Arabic.
   - Body typeface is Cairo (Arabic font) — check in DevTools → Computed → font-family.
   - Background color is `#0F1419` (dark).

---

## Check 2: English Locale (`/en`)

1. Navigate to `http://localhost:3000/en`.
2. **Expected**:
   - Page direction is LTR.
   - `<html>` element has `lang="en"` and `dir="ltr"`.
   - All navigation labels are in English (Features, Pricing, FAQ, Support).
   - Footer headings and links are in English.
   - Body typeface is Inter (English font).
   - Same dark background.

---

## Check 3: Language Switcher — Path Preservation

1. Navigate to `http://localhost:3000` (Arabic).
2. Locate the language switcher in the header.
3. Click it.
4. **Expected**: URL changes to `http://localhost:3000/en` — same page, English.
5. Click the language switcher again.
6. **Expected**: URL returns to `http://localhost:3000` — same page, Arabic.

If there were additional pages (e.g., `/support`), navigating to
`/support` in Arabic and switching should land on `/en/support`, not `/en`.

---

## Check 4: Header RTL/LTR Visual Inspection

**Arabic (`/`)**:
- Logo is at the top-right (logical start side).
- Nav links flow right → left (المميزات is the first item on the right).
- Language switcher is at the top-left (logical end side).
- No horizontal scrollbar.

**English (`/en`)**:
- Logo is at the top-left (logical start side).
- Nav links flow left → right (Features is first on the left).
- Language switcher is at the top-right (logical end side).
- No horizontal scrollbar.

---

## Check 5: Footer RTL/LTR Visual Inspection

**Arabic**:
- Footer columns flow from right side (المنتج column is first on the right).
- Copyright text is RTL.

**English**:
- Footer columns flow from left side (Product column is first on the left).
- Copyright text is LTR.

---

## Check 6: Responsive Layout (320px and 1920px)

1. Open Chrome DevTools → Device toolbar.
2. Set width to **320px**. Check both `/` and `/en`:
   - No horizontal scroll.
   - Mobile navigation is visible and functional.
   - Header does not overflow.
3. Set width to **1920px**. Check both locales:
   - Content is centered with max-width container.
   - No awkward stretching.

---

## Check 7: Keyboard Navigation

1. Load `http://localhost:3000`.
2. Press **Tab** from the top of the page:
   - First focusable element: "Skip to main content" link (if implemented).
   - Then: Logo link.
   - Then: All nav links in order.
   - Then: Language switcher.
3. Every focused element has a visible focus ring.
4. Press **Enter** or **Space** on the mobile menu button — menu opens.
5. Press **Tab** to navigate through mobile menu items.
6. Repeat for the footer.

---

## Check 8: Screen Reader Language Announcement

1. Enable VoiceOver (macOS) or NVDA (Windows).
2. Navigate to `http://localhost:3000`.
3. VoiceOver should announce "Arabic" as the page language.
4. Navigate to `http://localhost:3000/en`.
5. VoiceOver should announce "English" as the page language.

---

## Check 9: No Physical-Direction CSS

Run this grep from the `arabsyntax-web/` root to confirm no violations:

```bash
grep -r "pl-\|pr-\|ml-\|mr-\| left-\| right-\|text-left\|text-right\|border-l-\|border-r-" \
  components/ app/\[locale\]/ \
  --include="*.tsx" --include="*.ts"
```

**Expected**: Zero matches. Any match is a constitution violation.

---

## Check 10: Lighthouse Accessibility

1. Open Chrome and navigate to `http://localhost:3000`.
2. Open DevTools → Lighthouse tab.
3. Select **Accessibility** category only.
4. Run audit.
5. **Expected**: Score ≥ 95.
6. Repeat for `http://localhost:3000/en`.

---

## Common Issues

| Symptom | Likely Cause |
|---------|-------------|
| Site shows in English at `/` | `defaultLocale` not set to `'ar'` in `i18n/routing.ts` |
| `dir="rtl"` missing | `await params` not used in layout; locale not passed to `<html>` |
| Cairo font not applying | `--font-cairo` variable not registered in `@theme` or wrong class on `<body>` |
| Language switcher goes to `/en` home, not current page | Using `href="/en"` instead of next-intl's `Link` with `locale` prop |
| Physical-direction CSS warning | Used `pl-*`/`pr-*`; replace with `ps-*`/`pe-*` |
| Mobile menu not keyboard-accessible | Toggle button missing `aria-expanded` or menu `id` |
