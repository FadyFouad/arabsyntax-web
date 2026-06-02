# Tasks: Launch Polish — Real Brand, Real App

**Input**: Design documents from `/specs/005-launch-polish/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: No test tasks are generated — the spec does not request TDD or automated tests. Verification is manual per `quickstart.md`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: Next.js App Router at `arabsyntax-web/` root
- `lib/` — shared modules (siteConfig, featureFlags)
- `app/` — routes and metadata
- `components/` — UI sections, layout, SEO
- `messages/` — i18n JSON files
- `content/legal/` — MDX legal pages

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new config modules that every other task depends on

- [x] T001 Create brand and rating single source of truth in `lib/siteConfig.ts`
- [x] T002 Create pricing feature flag module in `lib/featureFlags.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core brand-rename pass and message file rewrites that MUST be complete before any user story phase can proceed

**⚠️ CRITICAL**: These tasks touch shared resources (message files, layout metadata) that all user stories depend on

- [x] T003 Rewrite `messages/en.json` — update hero copy (eyebrow, headline, subtitle, social proof line), audience copy, FAQ answers, free-callout strings, footer copyright; remove no keys; keep pricing keys intact per FR-016
- [x] T004 Rewrite `messages/ar.json` — mirror all changes from T003 in Arabic with Arabic-Indic digits for social proof (`٤٫٧`, `٢٬٦٠٠`) and natural Arabic phrasing throughout
- [x] T005 Update root layout metadata in `app/[locale]/layout.tsx` — set `metadataBase` from `siteConfig.url`, set `siteName` from `siteConfig.name[locale]`, add `openGraph` defaults using siteConfig

**Checkpoint**: Config modules created, message files rebranded, layout metadata updated — user story implementation can now begin

---

## Phase 3: User Story 1 — A prospective learner sees the real product (Priority: P1) 🎯 MVP

**Goal**: The hero shows the real brand, real copy, social proof line, and working store badges in both locales

**Independent Test**: Load `/` — hero shows "النحو الكافي", real Arabic copy, social proof "★ ٤٫٧ · أكثر من ٢٬٦٠٠ تقييم على Google Play" below badges. Switch to `/en` — same info in English with "Al-Nahw Al-Kafi". Both badges open real store listings.

### Implementation for User Story 1

- [x] T006 [P] [US1] Update `components/ui/PlayStoreBadge.tsx` — replace placeholder URL with import from `siteConfig.stores.googlePlay`
- [x] T007 [P] [US1] Update `components/ui/AppStoreBadge.tsx` — replace hardcoded URL with import from `siteConfig.stores.appStore`
- [x] T008 [US1] Update `components/sections/Hero.tsx` — add social proof `<p>` element below badge container using `landing.hero.socialProof` message key; add `<span aria-hidden="true">` on star glyph; source eyebrow and subtitle from updated message keys
- [x] T009 [US1] Update `components/layout/Header.tsx` — import brand from `siteConfig.name[locale]`; import `featureFlags` and conditionally filter `#pricing` from nav links when `showPricing` is false
- [x] T010 [US1] Update `components/layout/Footer.tsx` — import brand from `siteConfig.name[locale]`; update copyright to "© {year} ETA TECH"; import `featureFlags` and filter pricing link from Product column

**Checkpoint**: Hero, header, footer all show real brand and correct store links in both locales

---

## Phase 4: User Story 2 — Search engine and social share preview are accurate (Priority: P1)

**Goal**: SEO metadata, Open Graph tags, structured data, sitemap, and robots are all correct and reference the real brand

**Independent Test**: Validate JSON-LD with Google Rich Results Test; validate OG tags with opengraph.xyz; fetch `/sitemap.xml` and `/robots.txt`; grep for "ArabSyntax" returns zero user-visible matches

### Implementation for User Story 2

- [x] T011 [P] [US2] Create `components/seo/StructuredData.tsx` — Server Component that renders `<script type="application/ld+json">` with `SoftwareApplication` schema; interpolate `siteConfig.name[locale]`, `siteConfig.stores`, `siteConfig.rating`, `offers.price: "0"`, `priceCurrency: "USD"`, `applicationCategory: "EducationalApplication"`, `operatingSystem: "ANDROID, IOS"`, `author: { @type: "Organization", name: siteConfig.developer.name }`
- [x] T012 [P] [US2] Create `app/sitemap.ts` — export default function returning `MetadataRoute.Sitemap` with entries for all 4 routes × 2 locales (8 entries); use `siteConfig.url` as base; include `xhtml:link rel="alternate" hreflang` alternates for each locale pair
- [x] T013 [P] [US2] Create `app/robots.ts` — export default function returning `MetadataRoute.Robots` allowing all user agents and pointing `Sitemap` at `${siteConfig.url}/sitemap.xml`
- [x] T014 [US2] Update `app/[locale]/page.tsx` — add `openGraph` block to `generateMetadata` (title, description, siteName, url, locale, images with `og-image.png` at 1200×630); render `<StructuredData locale={locale} />` in the page body
- [x] T015 [P] [US2] Update `app/[locale]/privacy/page.tsx` — add `openGraph` block to `generateMetadata` with brand-correct title and description from siteConfig
- [x] T016 [P] [US2] Update `app/[locale]/terms/page.tsx` — add `openGraph` block to `generateMetadata` with brand-correct title and description from siteConfig
- [x] T017 [P] [US2] Update `app/[locale]/support/page.tsx` — add `openGraph` block to `generateMetadata` with brand-correct title and description; replace hardcoded `SUPPORT_EMAIL` fallback with `siteConfig.developer.email`

**Checkpoint**: All pages have correct OG metadata, sitemap lists all routes, JSON-LD validates, brand grep returns zero matches

---

## Phase 5: User Story 3 — Legal pages match the real app (Priority: P1)

**Goal**: Privacy Policy and Terms of Service are rewritten to match the live Google Play Data Safety declaration and describe a free app with no subscriptions

**Independent Test**: Load `/privacy` and `/en/privacy` — policy lists exactly three data categories (App activity, App info and performance, Device or other IDs), states no developer collection, states not encrypted in transit, states not deletable on request, has children's section, shows contact email. Load `/terms` and `/en/terms` — zero occurrences of "subscription", "refund", "billing", "auto-renew", "legacy"

### Implementation for User Story 3

- [x] T018 [P] [US3] Rewrite `content/legal/privacy.en.mdx` — 9 sections: Introduction, Information We Collect (no developer collection), Data Sharing (3 categories), Data Encryption (not encrypted), Data Deletion (not deletable), Children's Privacy, Third-Party Services, Changes to Policy, Contact (`fady.fouad.a@gmail.com`); keep DRAFT comment; update `lastUpdated` frontmatter
- [x] T019 [P] [US3] Rewrite `content/legal/privacy.ar.mdx` — mirror English structure in natural Arabic; same 9 sections; Arabic-Indic digits where applicable; keep DRAFT comment; update `lastUpdated` frontmatter
- [x] T020 [P] [US3] Rewrite `content/legal/terms.en.mdx` — 10 sections per research.md Decision 9: Acceptance, Description (free app), License, Intellectual Property, User Conduct, Disclaimer, Limitation of Liability, Changes, Governing Law (Egypt), Contact; zero commercial terms; update `lastUpdated` frontmatter
- [x] T021 [P] [US3] Rewrite `content/legal/terms.ar.mdx` — mirror English structure in natural Arabic; zero commercial terms; update `lastUpdated` frontmatter

**Checkpoint**: Legal pages match Data Safety declaration; terms contain no subscription/refund language

---

## Phase 6: User Story 4 — Pricing section hidden behind feature flag (Priority: P2)

**Goal**: Pricing section is gated by `featureFlags.showPricing`; a free-to-download callout replaces it; flipping the flag restores pricing

**Independent Test**: Load landing page — no Pricing section visible, FreeCallout shown instead. Flip flag to `true`, rebuild — Pricing section appears, FreeCallout hidden. Header and footer nav links for Pricing conditionally appear/disappear with the flag.

### Implementation for User Story 4

- [x] T022 [US4] Create `components/sections/FreeCallout.tsx` — Server Component rendering a `SectionHeading` with free-to-download message key plus a single `PlayStoreBadge` CTA; uses only logical CSS utilities; no new color tokens
- [x] T023 [US4] Update `app/[locale]/page.tsx` — import `featureFlags`; conditionally render `<Pricing />` when `showPricing` is true and `<FreeCallout />` when false, at the same vertical location in the section order
- [x] T024 [US4] Update `components/sections/Pricing.tsx` — replace local `PLAY_STORE_URL` constant with import from `siteConfig.stores.googlePlay` (per research.md Decision 4); preserve all other code byte-identical per FR-016

**Checkpoint**: Flag-flip test passes both directions; nav links gated correctly (already done in T009/T010)

---

## Phase 7: User Story 5 — Audience section with equal visual weight (Priority: P2)

**Goal**: Two audience cards with equal visual treatment — general learners and ثانوية عامة students

**Independent Test**: Load landing page, scroll to Audiences. Two cards of equal width/height. Arabic copy uses natural terminology for both audiences.

### Implementation for User Story 5

- [x] T025 [US5] Verify `components/sections/Audiences.tsx` layout is already compliant per research.md Decision 6 — no structural changes needed; if copy changes are needed beyond T003/T004, update the `landing.audiences.*` message keys in both locale files

**Checkpoint**: Audience cards render with equal treatment in both locales

---

## Phase 8: User Story 6 — FAQ answers match the real app (Priority: P2)

**Goal**: FAQ answers are consistent with: free app, both stores, both audiences; no references to subscriptions/tiers/refunds

**Independent Test**: Load FAQ on `/` and `/en`. Answers mention free, both platforms, both audiences. No pricing-tier/subscription language.

### Implementation for User Story 6

- [x] T026 [US6] Verify FAQ answers in `messages/en.json` and `messages/ar.json` (already updated in T003/T004) are consistent with FR-036 and FR-037 — the app is free, available on both stores, serves both audiences; no subscription/freemium/refund/coupon language remains; offline FAQ uses conservative placeholder per research.md Decision 11

**Checkpoint**: FAQ content matches approved list from quickstart.md Step 13

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Deferred items, Resend rebrand, OG image placeholder, final validation

- [x] T027 [P] Update `lib/email/resend.ts` — replace `'ArabSyntax Support <support@arabsyntax.com>'` from-address with `siteConfig.name.en + " Support <" + siteConfig.developer.email + ">"` and rebrand subject prefix; relax throw on missing `SUPPORT_EMAIL` env var to fallback from siteConfig
- [x] T028 [P] Create `LAUNCH_TODO.md` at repo root — document deferred items: (1) OG image rebrand at `public/og/og-image.png` (1200×630, dark theme, both brand forms), (2) Constitution §Terminology amendment (v1.0.2), (3) FAQ offline answer confirmation
- [x] T029 Run brand-rename grep gate from quickstart.md Step 1 — verify zero matches for "ArabSyntax" and "النحو العربي" in user-visible files (excluding `specs/005-launch-polish/`, `node_modules/`, `.next/`, and `com.etateck.arabsyntax` infrastructure ID)
- [x] T030 Run forbidden Tailwind utilities grep from quickstart.md Step 2 — verify zero matches for physical direction utilities in `components/` and `app/`
- [x] T031 Run `npm run lint` and `npm run build` — verify both exit 0
- [x] T032 Run quickstart.md full verification procedure (Steps 4–16) — visual QA, metadata checks, JSON-LD validation, Lighthouse ≥ 95 all categories

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — hero, header, footer, badges
- **User Story 2 (Phase 4)**: Depends on Phase 2 — SEO metadata, structured data, sitemap, robots
- **User Story 3 (Phase 5)**: Depends on Phase 1 only (needs siteConfig for email) — legal page MDX rewrites are independent of message files
- **User Story 4 (Phase 6)**: Depends on Phase 1 (featureFlags) + Phase 3 (header/footer already gated in US1)
- **User Story 5 (Phase 7)**: Depends on Phase 2 (message file copy)
- **User Story 6 (Phase 8)**: Depends on Phase 2 (message file copy)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational (Phase 2) → can start immediately after
- **US2 (P1)**: Foundational (Phase 2) → can run in parallel with US1
- **US3 (P1)**: Setup (Phase 1) → can run in parallel with US1 and US2 (MDX files are independent of message files)
- **US4 (P2)**: Setup (Phase 1) + US1 header/footer gating → sequential after US1
- **US5 (P2)**: Foundational (Phase 2) → verification only; can run any time after Phase 2
- **US6 (P2)**: Foundational (Phase 2) → verification only; can run any time after Phase 2

### Within Each User Story

- Config imports before component edits
- Component edits before page-level integration
- Page-level integration before cross-cutting validation

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel
- T003 and T004 (message files) can run in parallel
- T006 and T007 (badge components) can run in parallel
- T011, T012, T013 (StructuredData, sitemap, robots) can run in parallel
- T015, T016, T017 (page metadata updates) can run in parallel
- T018, T019, T020, T021 (legal MDX rewrites) can all run in parallel
- US1, US2, US3 can run in parallel after Phase 2

---

## Parallel Example: User Story 1

```bash
# Launch badge updates together (different files, no dependencies):
Task: "Update PlayStoreBadge.tsx — replace placeholder URL with siteConfig import"
Task: "Update AppStoreBadge.tsx — replace hardcoded URL with siteConfig import"

# Then Hero update (depends on badge components being importable):
Task: "Update Hero.tsx — add social proof line, update copy sources"
```

## Parallel Example: User Story 2

```bash
# Launch all new SEO files together (no interdependencies):
Task: "Create StructuredData.tsx — SoftwareApplication JSON-LD"
Task: "Create app/sitemap.ts — bilingual sitemap"
Task: "Create app/robots.ts — robots config"

# Then page metadata updates in parallel (different files):
Task: "Update privacy/page.tsx — add openGraph block"
Task: "Update terms/page.tsx — add openGraph block"
Task: "Update support/page.tsx — add openGraph block"
```

## Parallel Example: User Story 3

```bash
# All four MDX files can be rewritten simultaneously:
Task: "Rewrite privacy.en.mdx"
Task: "Rewrite privacy.ar.mdx"
Task: "Rewrite terms.en.mdx"
Task: "Rewrite terms.ar.mdx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + 3)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T005)
3. Complete Phase 3: User Story 1 — hero, badges, header, footer (T006–T010)
4. **STOP and VALIDATE**: Brand grep gate (T029), dev server smoke test on `/` and `/en`
5. Complete Phase 4: User Story 2 — SEO surfaces (T011–T017)
6. Complete Phase 5: User Story 3 — legal pages (T018–T021)
7. **STOP and VALIDATE**: Full build, Lighthouse, legal compliance checks

### Incremental Delivery

1. Setup + Foundational → Config and message files done
2. US1 → Hero is correct → immediate visual validation
3. US2 → SEO is correct → metadata validation
4. US3 → Legal pages correct → compliance validation
5. US4 → Pricing hidden → feature flag test
6. US5 + US6 → Audiences + FAQ → content consistency check
7. Polish → grep gates, build, Lighthouse → ship

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks generated — verification is manual per quickstart.md
- The feature is an atomic content pass — commit as one per quickstart.md Step 16
- `LAUNCH_TODO.md` tracks deferred items that are NOT blockers for landing the feature but MUST be resolved before the first public share of the site URL
