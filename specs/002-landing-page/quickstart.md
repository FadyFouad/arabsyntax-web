# Quickstart: Landing Page Verification

**Feature**: 002-landing-page | **Date**: 2026-04-10

Run these checks after each implementation phase to verify correctness.

---

## Prerequisites

```bash
cd arabsyntax-web
npm run dev
# Open http://localhost:3000
```

---

## Check 1: All Eight Sections Render (Arabic)

1. Navigate to `http://localhost:3000`.
2. Scroll from top to bottom.
3. **Expected** (in order): Hero → Features → How It Works → Screenshots →
   Pricing → Target Audience → FAQ → Final CTA.
4. Every section heading is in Arabic.
5. Layout is right-to-left throughout.

---

## Check 2: All Eight Sections Render (English)

1. Navigate to `http://localhost:3000/en`.
2. Repeat the scroll.
3. **Expected**: Same eight sections in English with LTR layout.

---

## Check 3: Anchor Navigation

From the header, click each nav link and verify it scrolls to the correct section:

| Header link | Expected target section |
|-------------|------------------------|
| المميزات / Features | Features section (`id="features"`) |
| الأسعار / Pricing | Pricing section (`id="pricing"`) |
| الأسئلة الشائعة / FAQ | FAQ section (`id="faq"`) |

Verify on both `/` and `/en`. Scrolling should be smooth (not instant).

---

## Check 4: Google Play Badge Links

1. On the Arabic page, click the Play Store badge in the **Hero**.
2. **Expected**: Play Store listing opens in a new tab.
3. Click the badge in the **Final CTA**.
4. **Expected**: Same Play Store listing opens.
5. Repeat on `/en`.

---

## Check 5: FAQ Accordion — Mouse

1. Scroll to the FAQ section on `http://localhost:3000`.
2. Click the first question.
3. **Expected**: Answer expands below the question.
4. Click the same question again.
5. **Expected**: Answer collapses.
6. Click two different questions.
7. **Expected**: Both are open simultaneously.

---

## Check 6: FAQ Accordion — Keyboard

1. Tab through the page until focus reaches the first FAQ question's `<summary>`.
2. Press **Space** or **Enter**.
3. **Expected**: Answer expands.
4. Press **Space** or **Enter** again.
5. **Expected**: Answer collapses.
6. Tab to the next question — repeat.
7. Focus indicator must be visible on each `<summary>` element.

---

## Check 7: FAQ Accordion — Screen Reader

1. Enable VoiceOver (macOS) or NVDA (Windows).
2. Navigate to an FAQ `<summary>`.
3. **Expected**: Screen reader announces the question text.
4. Activate it.
5. **Expected**: Screen reader announces "expanded" (or equivalent in the OS).
6. Activate again.
7. **Expected**: Screen reader announces "collapsed".

---

## Check 8: Pricing Section

1. Scroll to Pricing on `/` (Arabic).
2. **Expected**:
   - Four offerings visible (free + monthly + yearly + lifetime).
   - Yearly card has a "الأكثر شيوعاً" label and a highlighted border.
   - A legacy purchaser note is visible below the tier cards.
3. Click any paid tier CTA button.
4. **Expected**: Play Store listing opens. No payment form appears on the page.

---

## Check 9: RTL/LTR Layout Correctness

**Hero two-column (lg+ viewport)**:
- Arabic (`/`): Text block appears on the visual **right**, phone mockup on the **left**.
- English (`/en`): Text block appears on the visual **left**, phone mockup on the **right**.

**Features grid**:
- Arabic: Cards flow from right to left.
- English: Cards flow from left to right.

**Run the RTL grep check** (no physical-direction CSS):
```bash
grep -r "pl-\|pr-\|ml-\|mr-\| left-\| right-\|text-left\|text-right\|border-l-\|border-r-" \
  components/sections/ components/ui/ \
  --include="*.tsx"
```
Expected: zero matches.

---

## Check 10: Responsiveness

Test at four viewport widths in both locales:

| Width | Hero | Features grid | Audience cards |
|-------|------|---------------|---------------|
| 320px | Stacked (1 col) | 1 col | Stacked |
| 768px | Stacked | 2 col | Side by side |
| 1024px | 2 col | 3 col | Side by side |
| 1920px | 2 col (centered) | 3 col (centered) | Side by side (centered) |

No horizontal scrollbar at any width (except the Screenshots scroll-snap
carousel on mobile, which is intentional).

---

## Check 11: Lighthouse Audit

1. Open Chrome → DevTools → Lighthouse.
2. Run on `http://localhost:3000`:
   - **Performance**: target ≥ 95
   - **Accessibility**: target ≥ 95
3. Run on `http://localhost:3000/en` with same targets.
4. Common issues to watch for:
   - Missing alt text on badge images
   - Color contrast on `text-text-muted` against `bg-surface`
   - Missing `aria-label` on icon-only elements
   - LCP caused by unoptimized hero mockup (ensure `priority={true}`)

---

## Check 12: prefers-reduced-motion

1. Enable reduced motion in OS settings (macOS: System Settings → Accessibility → Display → Reduce Motion).
2. Reload `http://localhost:3000`.
3. **Expected**: No fade-up animations occur on scroll. Sections appear immediately.
4. Disable reduced motion, reload.
5. **Expected**: Subtle fade-up animations appear as sections enter the viewport.

---

## Common Issues

| Symptom | Likely Cause |
|---------|-------------|
| Section missing in Arabic but present in English | Missing key in `ar.json` |
| Hero columns don't flip between locales | Using physical flex-row-reverse without RTL variant |
| FAQ not expanding on keyboard | `<summary>` not receiving focus; check tabindex |
| Play Store badge broken image | Asset not placed in `public/badges/` |
| Animation plays despite prefers-reduced-motion | `useReducedMotion()` not called in AnimatedSection |
| Lighthouse LCP > 2.5s | Hero mockup not using `priority={true}` |
