# Tasks: Marketing Landing Page

**Input**: Design documents from `specs/002-landing-page/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅,
contracts/message-schema.md ✅, quickstart.md ✅

**Foundation assumption**: Feature 001 (site foundation) is complete. The
`[locale]` layout, Header, Footer, LanguageSwitcher, Container, fonts, theme
tokens, proxy.ts, and i18n routing all exist and work.

**Organization**: Tasks grouped by user story. No test tasks (not requested).

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: US1–US7 maps to user stories from spec.md
- All paths are relative to `arabsyntax-web/` project root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install missing dependencies, create shared UI building blocks, and
extend message files with the full `landing.*` namespace. All story phases depend
on these.

- [x] T001 Install framer-motion: `npm install framer-motion` in `arabsyntax-web/`
- [x] T002 [P] Create `components/ui/AnimatedSection.tsx` — `'use client'` component. Imports `motion` from `framer-motion` and `useReducedMotion`. Wraps children in a `<motion.div>` with `initial={{ opacity: 0, y: 20 }}`, `whileInView={{ opacity: 1, y: 0 }}`, `viewport={{ once: true }}`, `transition={{ duration: 0.5, ease: 'easeOut' }}`. When `useReducedMotion()` returns `true`, renders children directly with no animation.
- [x] T003 [P] Create `components/ui/SectionHeading.tsx` — Server Component. Accepts `heading: string`, `subtitle?: string`, and optional `className`. Renders an `<h2 className="text-4xl font-bold text-text">` and an optional `<p className="text-text-muted">`. Used by all eight sections.
- [x] T004 [P] Create `components/ui/Card.tsx` — Server Component. Accepts `children` and optional `className`. Renders a `<div className="bg-surface border border-border rounded-2xl p-6 lg:p-8">` shell. Used by Features, Pricing, and Audiences sections.
- [x] T005 [P] Create `components/ui/PlayStoreBadge.tsx` — Server Component. Accepts `locale: string` and `className?: string`. Renders a `next/image` of `public/badges/google-play-{locale}.png` with `width={200} height={59}` and locale-appropriate alt text. Wraps the image in an `<a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">`. Define `PLAY_STORE_URL` as a constant (placeholder value with a TODO comment to replace with the real URL).
- [x] T006 [P] Create `components/ui/AppStoreBadge.tsx` — Server Component. Returns `null`. Add a comment: `// TODO: Enable when iOS app ships`. No props needed yet.
- [x] T007 [P] Add badge assets: place `public/badges/google-play-en.png` and `public/badges/google-play-ar.png` (download official Google Play badge from Android brand guidelines, or use a placeholder PNG until the real asset is obtained). Both files must exist before PlayStoreBadge can render.
- [x] T008 [P] Add placeholder screenshot assets: create three solid dark-colored PNG images (`390×844` px each) at `public/screenshots/lesson.png`, `public/screenshots/quiz.png`, `public/screenshots/examples.png`. These are development placeholders — replace with real screenshots before marking the feature done.
- [x] T009 Extend `messages/ar.json` — add the complete `landing` namespace per `contracts/message-schema.md`. All Arabic copy must be real Arabic (no Lorem Ipsum). Mark pricing placeholder values with `// TODO` comments where JSON allows (use a companion note in the file or a separate README in `messages/`). Include all sub-namespaces: `hero`, `features`, `howItWorks`, `screenshots`, `pricing`, `audiences`, `faq`, `finalCta`.
- [x] T010 Extend `messages/en.json` — add matching `landing` namespace. Every key in `en.json` MUST match every key in `ar.json`. Verify parity by diffing key sets.
- [x] T011 Update `app/globals.css` — add `html { scroll-behavior: smooth; }` so anchor links from the header scroll smoothly to section IDs.

**Checkpoint**: `npm run dev` starts without errors. `PlayStoreBadge`, `Card`,
`SectionHeading`, and `AnimatedSection` can be imported without TypeScript errors.
Both message files have the complete `landing.*` key tree.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire up shared assets and the landing page composition entry point
before individual section components are built.

**⚠️ CRITICAL**: No user story section work can begin until this phase is complete.

- [x] T012 Update `app/[locale]/page.tsx` — replace the current placeholder `<h1>` with a full page composition. The page imports all eight section components (can be stubbed initially) and renders them in order with their section `id` attributes: `<Hero />`, `<section id="features"><Features /></section>`, `<section id="how-it-works"><HowItWorks /></section>`, `<section id="screenshots"><Screenshots /></section>`, `<section id="pricing"><Pricing /></section>`, `<section id="audiences"><Audiences /></section>`, `<section id="faq"><FAQ /></section>`, `<FinalCTA />`. Pass `locale` from `await params` down to any component that needs it (PlayStoreBadge).
- [x] T013 Add SEO metadata export to `app/[locale]/page.tsx` — export an async `generateMetadata` function that reads `landing.hero.headline` and `landing.hero.valueProposition` from the locale messages and returns a `Metadata` object with `title`, `description`, and a `canonical` URL.

**Checkpoint**: `npm run dev` renders the page at `/` and `/en` without crashing.
Even if section components are empty stubs, the composition compiles and routes work.

---

## Phase 3: User Story 1 — Arabic Visitor Discovers the App (Priority: P1) 🎯 MVP

**Goal**: An Arabic visitor at the root URL sees the full page in Arabic RTL and
can tap the Google Play badge to download the app.

**Independent Test**: Load `/`. All eight sections render in Arabic RTL. Both
Google Play badges link to the Play Store. No broken images.

### Implementation for User Story 1

- [x] T014 [US1] Create `components/sections/Hero.tsx` — Server Component. Accepts `locale: string`. Two-column layout at `lg+` using `flex flex-col lg:flex-row` (dir attribute on `<html>` automatically places text at the start side and mockup at the end side — no `rtl:` variant needed). Start column: `<h1>` with `landing.hero.headline`, tagline (`landing.hero.tagline`), value prop (`landing.hero.valueProposition`), and `<PlayStoreBadge locale={locale} />`. End column: `next/image` phone mockup (`public/screenshots/lesson.png` as a placeholder) with `priority={true}`, `width={390}`, `height={844}`, and `alt` from `landing.hero.mockupAlt`. Use `ps-*`/`pe-*`/`ms-*`/`me-*` for all directional spacing.
- [x] T015 [US1] Create `components/sections/FinalCTA.tsx` — Server Component. Accepts `locale: string`. Full-width `bg-surface-elevated` section, centered content. `<h2>` with `landing.finalCta.headline`, subtitle, and `<PlayStoreBadge locale={locale} />`. Uses `SectionHeading` for the h2.
- [ ] T016 [US1] Verify both Google Play badge instances link to the same `PLAY_STORE_URL` constant defined in `PlayStoreBadge.tsx` — open the page, right-click both badges, confirm `href` values match.

**Checkpoint (US1 done)**: Load `/`. Hero renders in Arabic RTL with two columns
on desktop. Both Play Store badges are visible and link correctly. FinalCTA shows
at the bottom with a badge.

---

## Phase 4: User Story 2 — English Visitor Discovers the App (Priority: P2)

**Goal**: The same Hero and FinalCTA render correctly in English LTR at `/en`.

**Independent Test**: Load `/en`. Hero text is on the left (start), mockup on
the right (end). All copy is in English.

### Implementation for User Story 2

- [ ] T017 [US2] Verify `Hero.tsx` renders correctly at `/en` — text block is on the visual left (start), mockup on the right (end). Confirm locale is passed through correctly from `page.tsx` → `Hero` → `PlayStoreBadge`.
- [ ] T018 [US2] Verify `FinalCTA.tsx` renders correctly at `/en` — English headline and CTA label. Badge renders the English variant.

**Checkpoint (US2 done)**: Load `/en`. Hero and FinalCTA render in English LTR
with correct column order and the English Play Store badge image.

---

## Phase 5: User Story 3 — Visitor Explores Features and How It Works (Priority: P2)

**Goal**: Six feature cards and three numbered steps are visible in both locales.
Anchor link #features scrolls to the Features section.

**Independent Test**: Load `/`. Scroll to Features — six cards with icons and
descriptions. Continue to How It Works — three numbered steps. Click header link
"المميزات" — smooth scroll to Features heading.

### Implementation for User Story 3

- [x] T019 [US3] Create `components/sections/Features.tsx` — Server Component. Gets `landing.features.*` translations. Renders `<SectionHeading>` and a grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. Each cell is an inline `FeatureCard` (not a separate file — keep it internal). Each card uses `<Card>` and renders a lucide-react icon (`Headphones`, `BookOpen`, `BrainCircuit`, `GraduationCap`, `PenLine`, `WifiOff` — see data-model.md), a `<h3>` for the title, and a `<p>` for the description. Wraps the grid in `<AnimatedSection>`. Uses only logical Tailwind spacing.
- [x] T020 [US3] Create `components/sections/HowItWorks.tsx` — Server Component. Gets `landing.howItWorks.*` translations. Renders `<SectionHeading>` and three steps in `flex flex-col md:flex-row gap-8`. Each step has a large numbered badge (`<span className="text-primary text-5xl font-bold">`), a `<h3>` title, and a description `<p>`. No AnimatedSection needed (simpler section).
- [ ] T021 [US3] Verify anchor scroll: navigate to `/` and click "المميزات" in the header — page scrolls smoothly to the Features section. Repeat on `/en` with "Features".

**Checkpoint (US3 done)**: Features and HowItWorks sections render in both locales
with correct translations. Anchor link #features works.

---

## Phase 6: User Story 4 — Visitor Reviews Pricing (Priority: P2)

**Goal**: Pricing section shows free + three paid tiers. Yearly is highlighted.
Legacy note is visible. Paid tier CTAs open the Play Store (no in-page checkout).
Anchor link #pricing scrolls to this section.

**Independent Test**: Load `/`. Scroll to Pricing — four offerings, yearly card
has a "الأكثر شيوعاً" badge and a highlighted `border-primary` border. Legacy
note is visible below the cards. Click any paid CTA — Play Store opens.

### Implementation for User Story 4

- [x] T022 [US4] Create `components/sections/Pricing.tsx` — Server Component. Gets `landing.pricing.*`. Renders `<SectionHeading>`. Then a responsive grid for the three paid tiers: `grid grid-cols-1 lg:grid-cols-3 gap-6`. Free tier is rendered as a separate `<Card>` banner above the grid with a muted style. Each paid `PricingCard` (inline component) uses `<Card>`, renders tier name, price, feature list (`<ul>`), and a `<a href={PLAY_STORE_URL}>` CTA button (styled with `bg-primary text-primary-fg rounded-xl`). The yearly card has an extra `border-2 border-primary` override and a "الأكثر شيوعاً" / "Most Popular" badge. Below the grid, render the legacy purchaser note as a `<p className="text-text-muted text-sm text-center">`. Wrap section in `<AnimatedSection>`. All spacing uses logical properties.
- [ ] T023 [US4] Verify no in-page checkout: inspect all CTA `<a>` elements — they must have `href` pointing to `PLAY_STORE_URL` (external link), not to any in-page form or `/checkout` route.
- [ ] T024 [US4] Verify anchor scroll #pricing works in both locales.

**Checkpoint (US4 done)**: Pricing renders four tiers in both locales. Yearly
card is highlighted. Legacy note is visible. All CTA clicks open the Play Store.

---

## Phase 7: User Story 5 — Visitor Gets Questions Answered via FAQ (Priority: P2)

**Goal**: FAQ accordion with at least six items. Each item expands/collapses.
Keyboard and screen reader accessible. Anchor link #faq scrolls here.

**Independent Test**: Load `/`. Scroll to FAQ — six questions listed, collapsed.
Click first question — answer expands. Click again — collapses. Tab to focus a
question and press Space — expands. Screen reader announces expanded/collapsed
state. Anchor link #faq scrolls correctly.

### Implementation for User Story 5

- [x] T025 [US5] Create `components/sections/FAQ.tsx` — Server Component. Gets `landing.faq.*`. Renders `<SectionHeading>` and a list of `<details>` elements. Each `<details>` contains a `<summary className="cursor-pointer flex justify-between items-center py-4 text-text font-semibold">` with the question text and a `<ChevronDown>` icon from lucide-react that rotates 180° when `<details>` is open (use `open:rotate-180 transition-transform` on the icon). The answer `<p>` is inside the `<details>` but outside the `<summary>`. Apply `divide-y divide-border` to the list container. No React state. No `'use client'`. Browser handles the open/closed toggle natively. Add Tailwind's `open:` variant styling (requires Tailwind v4 — verify it works with `<details open>`). All icon usage: `ChevronDown` icon needs `rtl:-scale-x-100` only if it's directional — for a vertical chevron it does NOT need RTL flip.
- [ ] T026 [US5] Verify FAQ keyboard behavior on `/`: Tab to focus the first `<summary>`, press Space — answer expands. Press Space again — collapses. Tab to next `<summary>` — focus moves correctly with visible focus ring.
- [ ] T027 [US5] Verify FAQ screen reader behavior: with VoiceOver/NVDA, navigate to a `<summary>` element — assistive technology announces the expanded/collapsed state.
- [ ] T028 [US5] Verify anchor scroll #faq works in both locales.

**Checkpoint (US5 done)**: FAQ renders six questions in both locales. Native
expand/collapse works with mouse and keyboard. No JS state required.

---

## Phase 8: User Story 6 — Target Audience Section (Priority: P3)

**Goal**: Two audience callout cards side by side (desktop), stacked (mobile).
Content specifically addresses ثانوية عامة students and general learners.

**Independent Test**: Load `/`. Scroll to Audiences — two cards side by side on
1024px+ viewport; stacked on 320px. Each card has a distinct heading addressing
its audience.

### Implementation for User Story 6

- [x] T029 [US6] Create `components/sections/Audiences.tsx` — Server Component. Gets `landing.audiences.*`. Renders `<SectionHeading>`. Then `flex flex-col md:flex-row gap-6`. Each audience uses `<Card>` with a lucide-react icon (`GraduationCap` for students, `BookHeart` for learners), an `<h3>` heading, and a description `<p>`. Uses `AnimatedSection` wrapper. All spacing uses logical properties (`ps-*`, `pe-*`, `gap-*`).
- [ ] T030 [US6] Verify on 320px viewport: two cards stack vertically. Verify on 1024px+: two cards appear side by side. Verify in both locales.

**Checkpoint (US6 done)**: Audiences section renders two distinct cards with
audience-specific copy in both Arabic and English. Responsive layout correct.

---

## Phase 9: User Story 7 — Screenshots Gallery (Priority: P3)

**Goal**: A gallery of at least three app screenshots. Mobile: horizontal scroll-snap.
Desktop: static grid. All images have locale-appropriate alt text.

**Independent Test**: Load `/` on mobile (320px) — screenshots scroll horizontally
with snap. On desktop (1024px+) — screenshots in a grid. Each image has a
non-empty alt attribute. Screen reader announces alt text.

### Implementation for User Story 7

- [x] T031 [US7] Create `components/sections/Screenshots.tsx` — Server Component. Gets `landing.screenshots.*`. Renders `<SectionHeading>`. Mobile layout: `flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4` with each screenshot in a `snap-center shrink-0` wrapper. Desktop layout: `hidden lg:grid lg:grid-cols-3 gap-6`. Each image uses `next/image` with `src`, explicit `width={390}`, `height={844}`, and `alt` from `landing.screenshots.alts.*`. Lazy loading (no `priority` prop — hero mockup already uses priority). Renders two sibling `<div>`s: one for mobile scroll, one for desktop grid (`hidden` on mobile).
- [ ] T032 [US7] Verify alt text: inspect each `<img>` element in DevTools — `alt` attribute must be non-empty and locale-appropriate (Arabic alt for `/`, English alt for `/en`).
- [ ] T033 [US7] Verify scroll direction: on mobile in Arabic locale, scroll-snap carousel scrolls from right to left (RTL). Confirm `dir="rtl"` on `<html>` causes the browser to handle RTL scroll direction natively.

**Checkpoint (US7 done)**: Screenshots render three placeholder images with
correct alt text in both locales. Mobile scroll-snap works. Desktop grid shows.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: RTL audit, Lighthouse targets, responsiveness check, missing alt
text, and overall page verification.

- [x] T034 [P] Run RTL grep check across all new components: `grep -r "pl-\|pr-\|ml-\|mr-\| left-\| right-\|text-left\|text-right\|border-l-\|border-r-" components/sections/ components/ui/ --include="*.tsx"` — must return zero matches
- [x] T035 [P] Verify message key parity: `diff <(jq 'path(..) | join(".")' messages/ar.json | sort) <(jq 'path(..) | join(".")' messages/en.json | sort)` — must produce empty output (or only differences in the known branch names, not key structure)
- [ ] T036 Run Lighthouse on `http://localhost:3000` — Performance ≥ 95, Accessibility ≥ 95. Fix any failing items.
- [ ] T037 Run Lighthouse on `http://localhost:3000/en` — same targets. Fix any failures.
- [ ] T038 [P] Verify all five anchor links from the header scroll correctly in both locales: #features, #pricing, #faq (and optionally #how-it-works, #screenshots if linked)
- [ ] T039 [P] Verify responsiveness at 320px, 768px, 1024px, 1920px in both locales — no horizontal scroll (except the Screenshots scroll-snap carousel on mobile, which is intentional)
- [ ] T040 [P] Verify prefers-reduced-motion: enable "Reduce Motion" in OS settings, reload — no AnimatedSection fade-up animations should play
- [ ] T041 Verify Hero image `priority={true}` — open DevTools → Network → Img tab and confirm the hero mockup loads without `loading="lazy"` attribute
- [ ] T042 [P] Verify all `next/image` elements have explicit `width` and `height` props — grep for `<Image` without `width` in `components/sections/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T002–T011 can run in parallel after T001 (install).
- **Foundational (Phase 2)**: Depends on Phase 1 complete — BLOCKS all section work.
- **US1 (Phase 3, P1)**: First section phase — hero and FinalCTA are entry points for the page.
- **US2 (Phase 4, P2)**: Validates US1 in the other locale — start after US1.
- **US3–US7 (Phases 5–9, P2–P3)**: All depend on Foundational; US3, US4, US5 can be built in parallel after Phase 2. US6 and US7 can also be built in parallel.
- **Polish (Phase 10)**: Depends on all section phases complete.

### Parallel Opportunities

```bash
# Phase 1 (after T001 install):
T002  # AnimatedSection
T003  # SectionHeading
T004  # Card
T005  # PlayStoreBadge
T006  # AppStoreBadge
T007  # Badge assets
T008  # Screenshot placeholder assets
T009  # ar.json landing namespace
T010  # en.json landing namespace
T011  # globals.css scroll-behavior

# Phase 3 (US1):
T014  # Hero.tsx
T015  # FinalCTA.tsx

# Phases 5, 6, 7 can run in parallel (after Phase 2):
T019  # Features.tsx     (US3)
T020  # HowItWorks.tsx   (US3)
T022  # Pricing.tsx      (US4)
T025  # FAQ.tsx          (US5)
T029  # Audiences.tsx    (US6)
T031  # Screenshots.tsx  (US7)

# Phase 10 parallel:
T034  # RTL grep
T035  # Message key parity
T038  # Anchor scroll verification
T039  # Responsiveness
T040  # Reduced motion
T042  # next/image width+height check
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 (Setup) — parallel install and utility components
2. Complete Phase 2 (Foundational) — wire page.tsx composition
3. Complete Phase 3 (US1) — Hero + FinalCTA with Play Store badges
4. **STOP and VALIDATE**: Load `/` — hero renders in Arabic RTL, both Play Store
   badges link correctly
5. Deliver: the page already converts for Arabic visitors

### Incremental Delivery

1. Setup + Foundational → page shell with stubs
2. US1 → Hero + FinalCTA → Arabic CTA flow works ✅
3. US2 → Validate English locale ✅
4. US3 → Features + HowItWorks ✅
5. US4 → Pricing section ✅
6. US5 → FAQ accordion ✅
7. US6 → Audience callouts ✅
8. US7 → Screenshots gallery ✅
9. Polish → Lighthouse + RTL audit

---

## Notes

- `[P]` tasks touch different files with no pending dependencies — safe to run in parallel
- All paths are relative to `arabsyntax-web/` project root
- **`<details>/<summary>` FAQ**: No `'use client'`, no React state — browser handles expand/collapse natively
- **Hero RTL**: `flex flex-row` with `dir="rtl"` on `<html>` automatically reverses column order — no `rtl:flex-row-reverse` needed
- **framer-motion**: Import only in `AnimatedSection.tsx`; all other section components are pure Server Components
- **All Arabic copy in T009**: must be real Arabic — layout and font rendering depend on authentic glyphs
- **PLAY_STORE_URL**: Define as a constant in `PlayStoreBadge.tsx` with a TODO comment pointing to the real URL; do NOT hardcode it in each section component
