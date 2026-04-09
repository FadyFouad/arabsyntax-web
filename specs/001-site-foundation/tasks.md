# Tasks: Site Foundation — Bilingual Shell

**Input**: Design documents from `specs/001-site-foundation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅,
contracts/message-schema.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story. No test tasks are generated (not
requested in spec).

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1–US5)
- All file paths are relative to `arabsyntax-web/` project root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install missing dependencies and create shared utility infrastructure
that every subsequent phase depends on.

- [ ] T001 Install missing npm packages: `npm install next-intl lucide-react clsx tailwind-merge` in `arabsyntax-web/`
- [ ] T002 [P] Create `lib/cn.ts` — export a `cn()` helper using `clsx` and `tailwind-merge`
- [ ] T003 [P] Create `i18n/routing.ts` — define `locales: ['ar', 'en']`, `defaultLocale: 'ar'`, `localePrefix: 'as-needed'` using `defineRouting` from `next-intl/routing`
- [ ] T004 [P] Create `i18n/request.ts` — implement `getRequestConfig` from `next-intl/server` that loads `messages/${locale}.json`
- [ ] T005 [P] Create `messages/ar.json` — real Arabic strings for `common`, `nav`, and `footer` namespaces per `contracts/message-schema.md` (no Lorem Ipsum; all copy must be real Arabic)
- [ ] T006 [P] Create `messages/en.json` — English strings matching every key in `ar.json`

**Checkpoint**: Dependencies installed, `lib/cn.ts` ready, `i18n/routing.ts` ready,
both message files have matching keys per the contract schema.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire up the Next.js 16 locale infrastructure that every user story
route depends on. MUST be complete before any layout or component work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Create `proxy.ts` at project root — export `proxy` function from `next-intl/middleware` using the routing config; add `config.matcher` that covers `/`, `/(ar|en)/:path*`, and all non-static paths. Use `export function proxy` NOT `export function middleware` (Next.js 16 convention)
- [ ] T008 Update `next.config.ts` — wrap the config with `withNextIntl` (or the next-intl Next.js plugin equivalent for the installed version) so the App Router picks up the i18n configuration
- [ ] T009 Update `app/globals.css` — replace the existing placeholder CSS with: (a) `@import "tailwindcss"`, (b) an `@theme {}` block containing all color tokens from `design-tokens.md` (`--color-background`, `--color-surface`, `--color-surface-elevated`, `--color-primary`, `--color-primary-hover`, `--color-primary-fg`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-success`, `--color-error`, `--color-warning`), and (c) `--font-arabic` / `--font-english` font-family tokens referencing `--font-cairo` / `--font-inter`. Remove the existing light/dark `prefers-color-scheme` block — dark theme only.
- [ ] T010 Create `components/ui/Container.tsx` — Server Component exporting a `<div>` with `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (symmetric padding is fine; no directional utilities needed for a centered wrapper)
- [ ] T011 Slim down `app/layout.tsx` (root layout) — keep it as a minimal passthrough: import `globals.css`, render `<html><body>{children}</body></html>` with no `lang`/`dir` or font setup (that belongs in `[locale]/layout.tsx`)
- [ ] T012 Delete `app/page.tsx` — it will be replaced by `app/[locale]/page.tsx` in US1
- [ ] T013 Create `app/[locale]/` directory structure — add `generateStaticParams` export returning `[{ locale: 'ar' }, { locale: 'en' }]` in the layout file (created in US1)

**Checkpoint**: `npm run dev` starts without errors. Navigating to `/` may show a
404 (no page yet) but the locale middleware intercepts the request correctly.
`/en` similarly. No runtime TypeScript errors.

---

## Phase 3: User Story 1 — Arabic Default Experience (Priority: P1) 🎯 MVP

**Goal**: A visitor navigating to the root URL sees the site in Arabic with
right-to-left layout and the Cairo typeface — without any language selection.

**Independent Test**: Navigate to `http://localhost:3000`. Confirm: `dir="rtl"`,
`lang="ar"` on `<html>`; Cairo font on body; all visible labels are in Arabic.

### Implementation for User Story 1

- [ ] T014 [US1] Create `app/[locale]/layout.tsx` — async Server Component that: (a) `await params` to get `locale`, (b) loads Cairo and Inter via `next/font/google` with `variable` option, (c) sets `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={\`${cairo.variable} ${inter.variable}\`}>`, (d) sets `<body className={locale === 'ar' ? 'font-arabic' : 'font-english'}>`, (e) wraps children in `<NextIntlClientProvider>`, (f) exports `generateStaticParams` returning `[{ locale: 'ar' }, { locale: 'en' }]`. Import `Header` and `Footer` (stubs are fine until US4/US5).
- [ ] T015 [US1] Create `app/[locale]/page.tsx` — minimal async Server Component that `await params`, gets translations via `getTranslations('common')`, and renders an `<h1>` with the app name. This is the foundation verification page — real content is added in the Landing feature.

**Checkpoint (US1 done)**: Navigate to `/`. `<html>` has `lang="ar" dir="rtl"`.
Body font-family is Cairo. Page renders in Arabic. Lighthouse a11y passes for
this stub page.

---

## Phase 4: User Story 2 — English Locale Experience (Priority: P2)

**Goal**: A visitor navigating to `/en` sees the site in English with LTR layout
and the Inter typeface.

**Independent Test**: Navigate to `http://localhost:3000/en`. Confirm: `dir="ltr"`,
`lang="en"` on `<html>`; Inter font on body; all visible labels are in English.

### Implementation for User Story 2

- [ ] T016 [US2] Verify `app/[locale]/layout.tsx` correctly applies `dir="ltr"` and `font-english` when `locale === 'en'` — this is covered by T014 but must be explicitly tested at this checkpoint by navigating to `/en`
- [ ] T017 [US2] Verify `messages/en.json` has all keys from `contracts/message-schema.md` and that the English strings render correctly at `/en` — fix any missing keys or mistranslations

**Checkpoint (US2 done)**: Navigate to `/en`. `<html>` has `lang="en" dir="ltr"`.
Body font-family is Inter. Nav and footer labels are in English. Switching to `/`
shows Arabic. Both locales have no horizontal scroll at 320 px and 1920 px.

---

## Phase 5: User Story 3 — Language Switcher (Priority: P1)

**Goal**: A visitor can switch locales from any page using the language switcher
in the header or footer, and the switch preserves the current page path.

**Independent Test**: On `/`, click the language switcher — URL becomes `/en`.
On `/en`, click it — URL returns to `/`. No home page redirect occurs.

### Implementation for User Story 3

- [ ] T018 [US3] Create `components/layout/LanguageSwitcher.tsx` — `'use client'` component. Uses `usePathname` and `useRouter` from `next-intl/navigation` (or `useLocale` + `Link` from next-intl). Renders two locale buttons/links: Arabic and English. The active locale link is visually distinguished (e.g., `text-primary`). Each link uses the next-intl `Link` component with `locale` prop so the current path is preserved. Add `aria-label` from `footer.langSwitcher.label` message key. Mark current locale with `aria-current="true"`.
- [ ] T019 [US3] Add `LanguageSwitcher` to both the Header stub and Footer stub created in T014 (or their actual implementations if US4/US5 tasks have been done first) — must appear in both places

**Checkpoint (US3 done)**: Language switcher in header and footer both switch
locale and preserve path. Keyboard-accessible (Tab + Enter). Focus indicator
visible. `aria-current="true"` on active locale.

---

## Phase 6: User Story 4 — Shared Header (Priority: P2)

**Goal**: Every page shows a consistent header with logo, nav links (Features,
Pricing, FAQ, Support), and the language switcher. Header is RTL/LTR adaptive
with no physical-direction CSS.

**Independent Test**: Load `/` and `/en`. In Arabic: logo is at the right
(start), nav links flow RTL. In English: logo is at the left (start), nav
links flow LTR. No horizontal overflow at 320 px.

### Implementation for User Story 4

- [ ] T020 [US4] Create `components/layout/MobileMenu.tsx` — `'use client'` component. Renders a `<button>` with `aria-expanded` and `aria-controls`; toggles `useState` to show/hide a `<nav id="mobile-menu">` containing the same nav links as the desktop nav. Uses `Menu` and `X` icons from `lucide-react`. No directional icon flip needed for these icons. All labels from `nav.*` message keys (pass as props from Server Component parent).
- [ ] T021 [US4] Create `components/layout/Header.tsx` — Server Component. Uses `Container` for width constraint. Desktop layout: logo at `start`, nav links in the center/end area, `LanguageSwitcher` at `end`. Uses only logical Tailwind properties: `ms-auto`, `ps-4`, `pe-4`, `start-0`, `end-0`, etc. Renders `MobileMenu` for mobile (hidden on `md:` breakpoint). Logo is the text logotype (ArabSyntax + النحو العربي). Nav links use next-intl `Link` component. Gets translations via `getTranslations('nav')`. Add `<header>` element with `role="banner"`. Add a "Skip to main content" link as the first child (`sr-only` until focused).
- [ ] T022 [US4] Wire `Header` into `app/[locale]/layout.tsx` replacing the stub — place it before `<main>` or the children wrapper. Wrap page content in `<main id="main-content">` so the skip link target exists.
- [ ] T023 [US4] Run the RTL grep check from `quickstart.md` — confirm zero `pl-*`/`pr-*`/`ml-*`/`mr-*`/`left-`/`right-` matches in `components/layout/Header.tsx` and `components/layout/MobileMenu.tsx`

**Checkpoint (US4 done)**: Header renders in both locales without visual bugs.
Logo side and nav direction flip correctly. Mobile menu opens and closes. All
nav links are keyboard-reachable with visible focus. No physical-direction CSS.

---

## Phase 7: User Story 5 — Shared Footer (Priority: P2)

**Goal**: Every page shows a consistent footer with three link groups (Product,
Legal, Support), the language switcher, and a copyright notice. Footer adapts
to RTL/LTR with no physical-direction CSS.

**Independent Test**: Load `/` and `/en`. Footer groups appear on the correct
side for each locale. Copyright text is visible. All links are keyboard-reachable.

### Implementation for User Story 5

- [ ] T024 [US5] Create `components/layout/Footer.tsx` — Server Component. Uses `Container`. Renders three `<nav aria-label="...">` columns (Product, Legal, Support) each with a heading and links per `contracts/message-schema.md`. Adds `LanguageSwitcher` and a copyright paragraph with dynamic year (`new Date().getFullYear()`). Uses only logical Tailwind properties for layout. Gets translations via `getTranslations('footer')`. Add `<footer>` element with `role="contentinfo"`.
- [ ] T025 [US5] Wire `Footer` into `app/[locale]/layout.tsx` replacing the stub — place it after `<main>` / children.
- [ ] T026 [US5] Run the RTL grep check — confirm zero physical-direction CSS matches in `components/layout/Footer.tsx`

**Checkpoint (US5 done)**: Footer renders in both locales. Column groups align
to the start side. All links are keyboard-reachable. Copyright year is correct.
Language switcher works from the footer.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories, accessibility audit,
and responsiveness verification.

- [ ] T027 [P] Run full RTL grep check across all components: `grep -r "pl-\|pr-\|ml-\|mr-\| left-\| right-\|text-left\|text-right\|border-l-\|border-r-" components/ app/\[locale\]/ --include="*.tsx"` — must return zero matches
- [ ] T028 [P] Verify `messages/ar.json` and `messages/en.json` have identical key sets — run `diff <(jq -r 'path(..) | join(".")' messages/ar.json | sort) <(jq -r 'path(..) | join(".")' messages/en.json | sort)` from project root — output must be empty
- [ ] T029 Run Lighthouse Accessibility audit on `http://localhost:3000` — score must be ≥ 95. Fix any failing items.
- [ ] T030 Run Lighthouse Accessibility audit on `http://localhost:3000/en` — score must be ≥ 95. Fix any failing items.
- [ ] T031 [P] Verify layout at 320 px viewport in both locales (Chrome DevTools) — no horizontal scroll, mobile menu functions
- [ ] T032 [P] Verify layout at 1920 px viewport in both locales — content centered, no awkward stretching
- [ ] T033 Verify skip-to-content link: Tab from top of page — first focus is the skip link; pressing Enter scrolls to `#main-content`
- [ ] T034 [P] Verify language switcher preserves path: navigate to a non-root path if available, or use the root — switching locale does not redirect to home
- [ ] T035 Follow quickstart.md Check 8 (screen reader language announcement) — VoiceOver announces Arabic/English correctly for each locale

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. Tasks T002–T006 can run in parallel after T001.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) complete — BLOCKS all user story phases.
- **US1 (Phase 3)**: Depends on Foundational. No other story dependencies.
- **US2 (Phase 4)**: Depends on Foundational. Largely validates US1's layout, so should follow US1.
- **US3 (Phase 5)**: Depends on Foundational. Can start after US1 (needs the layout shell to exist).
- **US4 (Phase 6)**: Depends on Foundational + US3 (LanguageSwitcher must exist to embed in Header).
- **US5 (Phase 7)**: Depends on Foundational + US3 (LanguageSwitcher must exist to embed in Footer).
- **Polish (Phase 8)**: Depends on all user stories complete.

### User Story Dependencies

- **US1 (P1)**: First — creates the layout shell everything else lives in.
- **US3 (P1)**: Second — LanguageSwitcher is needed by both Header and Footer.
- **US2 (P2)**: Can be verified in parallel with US3 (just needs US1 done).
- **US4 (P2)**: After US3 — embeds LanguageSwitcher.
- **US5 (P2)**: After US3 — embeds LanguageSwitcher.

### Parallel Opportunities

```bash
# Phase 1 parallel (after T001):
T002  # lib/cn.ts
T003  # i18n/routing.ts
T004  # i18n/request.ts
T005  # messages/ar.json
T006  # messages/en.json

# Phase 8 parallel:
T027  # RTL grep check
T028  # Message key parity check
T029  # Lighthouse Arabic
T030  # Lighthouse English
T031  # 320px viewport
T032  # 1920px viewport
T034  # Path preservation
T035  # Screen reader
```

---

## Implementation Strategy

### MVP First (US1 + US3)

1. Complete Phase 1: Setup (install deps, message files, i18n config)
2. Complete Phase 2: Foundational (proxy.ts, globals.css, next.config.ts)
3. Complete Phase 3: US1 — Arabic default experience
4. **STOP and VALIDATE**: Navigate to `/` — Arabic RTL layout renders correctly
5. Complete Phase 5: US3 — Language Switcher
6. **STOP and VALIDATE**: Language switcher preserves path between `/` and `/en`
7. Site is minimally functional in both locales

### Incremental Delivery

1. Setup + Foundational → infrastructure ready
2. US1 → Arabic layout shell working ✅ validate independently
3. US2 → English locale validated ✅ validate independently
4. US3 → Language switcher functional ✅ validate independently
5. US4 → Full header in both locales ✅ validate independently
6. US5 → Full footer in both locales ✅ validate independently
7. Polish → Lighthouse + RTL grep + responsiveness

---

## Notes

- `[P]` tasks touch different files with no incomplete dependencies — safe to run in parallel
- All file paths are relative to `arabsyntax-web/` project root
- RTL discipline is the highest-risk area — the grep check (T027) is mandatory
- `await params` is required in T014 and T015 — do NOT destructure params synchronously
- Use `export function proxy` in `proxy.ts`, NOT `export function middleware`
- Tailwind v4 `@theme` in CSS only — do not create `tailwind.config.ts` for colors/fonts
- All Arabic strings in `messages/ar.json` must be real Arabic copy (constitution rule)
