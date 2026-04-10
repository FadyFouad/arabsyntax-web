# Tasks: Legal Pages (Privacy Policy & Terms of Service)

**Input**: Design documents from `specs/003-legal-pages/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Foundation assumption**: Feature 001 (site foundation) is complete. The `[locale]`
layout, Header, Footer, LanguageSwitcher, Container, fonts, theme tokens, proxy.ts,
and i18n routing all exist and work.

**Organization**: Tasks grouped by user story. No test tasks (not requested).

**Critical note**: `next-mdx-remote` is ARCHIVED (2026-04-09). Use `@next/mdx` (official).

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: US1–US4 maps to user stories from spec.md
- All paths are relative to `arabsyntax-web/` project root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, configure MDX support, configure prose styling,
and extend message files. Everything in this phase is a prerequisite for all pages.

- [X] T001 Install MDX dependencies: run `npm install @next/mdx @mdx-js/loader @mdx-js/react @types/mdx` in `arabsyntax-web/`
- [X] T002 Install typography plugin: run `npm install -D @tailwindcss/typography` in `arabsyntax-web/`
- [X] T003 Update `next.config.ts` — import `createMDX` from `@next/mdx`; create `withMDX = createMDX({ extension: /\.mdx?$/ })`; add `pageExtensions: ['ts', 'tsx', 'mdx']` to `nextConfig`; wrap export as `export default withMDX(withNextIntl(nextConfig))`. The existing `withNextIntl` wrapper must be preserved.
- [X] T004 [P] Create `mdx-components.tsx` at project root — required by @next/mdx. Export `useMDXComponents` returning an empty object: `import type { MDXComponents } from 'mdx/types'; export function useMDXComponents(): MDXComponents { return {}; }`
- [X] T005 [P] Update `app/globals.css` — add `@plugin "@tailwindcss/typography";` after the `@import "tailwindcss"` line. Then add a `@layer components` block with prose dark-theme overrides using CSS custom properties: `--tw-prose-body: var(--color-text)`, `--tw-prose-headings: var(--color-text)`, `--tw-prose-links: var(--color-primary)`, `--tw-prose-bold: var(--color-text)`, `--tw-prose-quotes: var(--color-text-muted)`, `--tw-prose-counters: var(--color-text-muted)`, `--tw-prose-bullets: var(--color-text-muted)`, `--tw-prose-hr: var(--color-border)`, `line-height: 1.7`. Add a separate `[dir="rtl"] .prose { line-height: 1.8; }` rule for Arabic.
- [X] T006 [P] Extend `messages/ar.json` — add `"legal"` namespace: `{ "lastUpdated": "آخر تحديث", "privacyTitle": "سياسة الخصوصية", "termsTitle": "شروط الاستخدام" }`. Must be a sibling of `"landing"`, `"nav"`, `"footer"`.
- [X] T007 [P] Extend `messages/en.json` — add matching `"legal"` namespace: `{ "lastUpdated": "Last updated", "privacyTitle": "Privacy Policy", "termsTitle": "Terms of Service" }`. Must match exact key structure of `ar.json`.

**Checkpoint**: `npm run build` passes. The `prose` class applies dark-theme colors.
Both message files have the `legal.*` key tree.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared layout component used by all legal pages. Must exist before any
page component can be built.

**⚠️ CRITICAL**: No page work can begin until this phase is complete.

- [X] T008 Create `components/layout/LegalLayout.tsx` — async Server Component. Props: `title: string`, `lastUpdated: string`, `locale: string`, `children: React.ReactNode`. Implementation: (1) call `getTranslations('legal')` to get the "Last updated" label; (2) render a `<div className="max-w-prose mx-auto px-4 sm:px-6 py-12 lg:py-16">`; (3) inside: an `<h1 className="text-4xl font-bold text-text mb-2">{title}</h1>`; (4) a `<p className="text-text-muted text-sm mb-10">{t('lastUpdated')}: {lastUpdated}</p>`; (5) an `<article className="prose">{children}</article>`. Use only logical Tailwind properties (`ps-*`, `pe-*`). No `'use client'`.
- [X] T009 [P] Create `content/legal/` directory — create an empty placeholder to establish the directory before MDX files are added. The four MDX files will be added in Phase 3 and Phase 4.

**Checkpoint**: `LegalLayout` compiles without TypeScript errors. Importing it in a
page component does not throw.

---

## Phase 3: User Stories 1 & 2 — Privacy Policy Page (Priority: P1) 🎯 MVP

**Goal (US1)**: The Privacy Policy page is live at `/privacy` and `/en/privacy`,
publicly accessible, with non-empty content that can be submitted to Google Play Console.

**Goal (US2)**: A user or parent can read the policy and verify: no personal data
collected, app is safe for minors, EEA ad consent is explained, developer contact
is provided.

**Independent Test**: Load `/privacy` — page renders with Arabic RTL prose, all 12
section headings are present, children's section exists, contact email is listed.
Load `/en/privacy` — same content in English LTR. Both URLs return HTTP 200.

### Implementation for User Stories 1 & 2

- [X] T010 [US1] Create `content/legal/privacy.ar.mdx` — Arabic privacy policy. Start with YAML-style JS export (no YAML frontmatter, @next/mdx uses JS exports):
  ```mdx
  {/* DRAFT — REVIEW BY A LAWYER BEFORE PRODUCTION */}
  export const frontmatter = {
    title: 'سياسة الخصوصية',
    lastUpdated: '2026-04-10',
    description: 'كيف يجمع تطبيق النحو العربي بياناتك ويستخدمها.',
  };
  ```
  Then write the full Arabic prose body with 12 `## ` headings matching data-model.md section structure. Required content per spec FR-004 and FR-005: (1) المقدمة — تعريف التطبيق والشركة المطورة; (2) المعلومات التي نجمعها — معرّف مجهول عبر Firebase Anonymous Auth (لا اسم ولا بريد إلكتروني)، سجلات الاشتراك في Firestore مرتبطة بالمعرّف المجهول، معلومات الجهاز عبر AdMob للإعلانات; (3) كيف نستخدم المعلومات — تقديم الخدمة، مزامنة الاشتراك، عرض الإعلانات للطبقة المجانية; (4) خدمات الطرف الثالث — Firebase/Google (رابط لسياسة Google)، Google AdMob، Google Play Billing، Apple App Store; (5) الإعلانات والموافقة — شرح AdMob، نموذج الموافقة للمستخدمين في المنطقة الاقتصادية الأوروبية (UMP)، كيفية إعادة تعيين الموافقة; (6) الاحتفاظ بالبيانات — مدة حفظ المعرّف المجهول وسجلات الاشتراك; (7) خصوصية الأطفال — التطبيق مناسب للقاصرين، لا نجمع معلومات شخصية عن قصد، يحق للوالدين التواصل لطلب الحذف; (8) حقوقك — التواصل معنا لطلب حذف سجل الاشتراك; (9) الأمان — تدابير الحماية القياسية; (10) المستخدمون الدوليون — البيانات قد تُعالَج خارج بلدك عبر Firebase; (11) التغييرات على هذه السياسة — نحدِّث تاريخ "آخر تحديث"; (12) التواصل معنا — legal@arabsyntax.com (TODO: replace before launch).

- [X] T011 [US1] Create `content/legal/privacy.en.mdx` — English privacy policy. Same structure: JS `frontmatter` export (`title: 'Privacy Policy'`, `lastUpdated: '2026-04-10'`, `description: 'How the ArabSyntax app collects and uses your information.'`), then English prose with the same 12 `## ` headings (see data-model.md). Content must match Arabic version in scope and accuracy. Required sections: (1) Introduction; (2) Information We Collect — anonymous user ID via Firebase Anonymous Auth (no name, email, or personal info), entitlement records in Firestore keyed by anonymous ID, device information via Google AdMob; (3) How We Use Information; (4) Third-Party Services — Firebase/Google, AdMob, Google Play Billing, Apple App Store; (5) Ads and Consent — AdMob explanation, EEA consent form (UMP), how to reset consent; (6) Data Retention; (7) Children's Privacy — suitable for minors, no personal info knowingly collected, parents may contact developer; (8) Your Rights; (9) Security; (10) International Users; (11) Changes to This Policy; (12) Contact — legal@arabsyntax.com (TODO: replace before launch).

- [X] T012 [US1] Create `app/[locale]/privacy/page.tsx` — async Server Component. (1) Import both locale MDX files and their frontmatter exports: `import ContentAr, { frontmatter as fmAr } from '@/content/legal/privacy.ar.mdx'` and `import ContentEn, { frontmatter as fmEn } from '@/content/legal/privacy.en.mdx'`. (2) Destructure `locale` from `await params`. (3) Select: `const Content = locale === 'ar' ? ContentAr : ContentEn` and `const fm = locale === 'ar' ? fmAr : fmEn`. (4) Render `<LegalLayout title={fm.title} lastUpdated={fm.lastUpdated} locale={locale}><Content /></LegalLayout>`. (5) Export `generateMetadata` that reads the same frontmatter and returns `{ title: fm.title, description: fm.description, alternates: { canonical: locale === 'ar' ? '{baseUrl}/privacy' : '{baseUrl}/en/privacy', languages: { ar: '{baseUrl}/privacy', en: '{baseUrl}/en/privacy' } } }`. Do NOT set `robots: { index: false }` — the page must be publicly indexable.

**Checkpoint (US1+US2 done)**: `/privacy` loads in Arabic RTL with 12 section
headings. `/en/privacy` loads in English LTR. Children's privacy section is present.
EEA ad consent is explained. Contact email is visible. Build passes.

---

## Phase 4: User Story 3 — Terms of Service Page (Priority: P2)

**Goal**: The Terms of Service page is live at `/terms` and `/en/terms`. The legacy
purchaser clause is clearly visible. Billing defers to Google Play / Apple.

**Independent Test**: Load `/terms` — page renders in Arabic RTL with 12 section
headings. Legacy Purchasers section explicitly states one-time buyers keep premium
features permanently. Load `/en/terms` — same content in English LTR.

### Implementation for User Story 3

- [X] T013 [P] [US3] Create `content/legal/terms.ar.mdx` — Arabic Terms of Service. JS frontmatter export: `{ title: 'شروط الاستخدام', lastUpdated: '2026-04-10', description: 'شروط استخدام تطبيق النحو العربي.' }`. Full Arabic prose with 12 `## ` headings per data-model.md: (1) قبول الشروط — باستخدام التطبيق توافق على هذه الشروط; (2) وصف الخدمة — التطبيق يوفر دروساً صوتية وتفاعلية لتعلم النحو العربي; (3) الترخيص — رخصة شخصية غير تجارية وغير قابلة للتحويل; (4) الاشتراكات والفواتير — تُدار عبر Google Play وApple، الاسترداد وفق سياساتهم؛ رابط لسياسة استرداد Google Play; (5) **المستخدمون القدامى — فقرة واضحة وبارزة: المستخدمون الذين اشتروا التطبيق قبل نظام الاشتراك الجديد يحتفظون بجميع الميزات المدفوعة بشكل دائم على جميع أجهزتهم وبعد إعادة التثبيت، دون أي رسوم إضافية**; (6) سلوك المستخدم — لا هندسة عكسية، لا إعادة توزيع للمحتوى; (7) الملكية الفكرية — المحتوى مملوك للمطوِّر; (8) إخلاء المسؤولية عن الضمانات — الخدمة مقدَّمة "كما هي"; (9) تحديد المسؤولية — لا يُسأل المطوِّر عن الأضرار غير المباشرة; (10) التغييرات على الشروط — نحدِّث تاريخ "آخر تحديث"; (11) القانون الحاكم — يخضع هذا الاتفاق للقانون المصري; (12) التواصل معنا — legal@arabsyntax.com (TODO: replace before launch).

- [X] T014 [P] [US3] Create `content/legal/terms.en.mdx` — English Terms of Service. JS frontmatter export: `{ title: 'Terms of Service', lastUpdated: '2026-04-10', description: 'Terms for using the ArabSyntax app.' }`. Full English prose with 12 `## ` headings: (1) Acceptance of Terms; (2) Description of Service; (3) License to Use — personal, non-commercial, non-transferable; (4) Subscriptions and Billing — managed by Google Play and Apple; refunds governed by their policies; link to Google Play refund policy; (5) **Legacy Purchasers — prominent clause: users who purchased the app under the previous one-time-payment model retain all premium features permanently, across all their devices and after reinstalls, at no additional cost**; (6) User Conduct — no reverse engineering, no redistribution of content; (7) Intellectual Property — content owned by the developer; (8) Disclaimer of Warranties — service provided "as is"; (9) Limitation of Liability; (10) Changes to Terms; (11) Governing Law — governed by Egyptian law; (12) Contact — legal@arabsyntax.com (TODO: replace before launch).

- [X] T015 [US3] Create `app/[locale]/terms/page.tsx` — same pattern as `privacy/page.tsx`. Import `ContentAr, { frontmatter as fmAr }` from `@/content/legal/terms.ar.mdx` and `ContentEn, { frontmatter as fmEn }` from `@/content/legal/terms.en.mdx`. Select by locale. Render `<LegalLayout>`. Export `generateMetadata` with canonical URLs for `/terms` and `/en/terms`. No `robots: { index: false }`.

**Checkpoint (US3 done)**: `/terms` and `/en/terms` load without errors. Legacy
Purchasers section is present and explicit. Billing section defers to Google Play.
Governing Law says Egyptian law.

---

## Phase 5: User Story 4 — Footer Navigation (Priority: P2)

**Goal**: Footer "Legal" column links to Privacy Policy and Terms of Service using
locale-preserving navigation from both the Arabic and English versions of the site.

**Independent Test**: On `/` (Arabic), click the Privacy Policy footer link →
navigates to `/privacy`. Click Terms of Service link → navigates to `/terms`. On
`/en`, both links navigate to `/en/privacy` and `/en/terms` respectively.

### Implementation for User Story 4

- [X] T016 [US4] Update `components/layout/Footer.tsx` — in the Legal column, replace the existing placeholder `<a href="/privacy">` and `<a href="/terms">` anchor tags with next-intl `<Link href="/privacy">` and `<Link href="/terms">` components. Import `Link` from `next-intl/link` (not from `next/link`) so locale is automatically preserved. The link text already comes from `footer.legal.privacy` and `footer.legal.terms` message keys — verify these are wired correctly. Do NOT use hardcoded strings for link text.

**Checkpoint (US4 done)**: Footer links on both `/` and `/en` navigate to the
correct locale-prefixed legal pages.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: RTL audit, build verification, public-accessibility check, and final
page quality checks.

- [X] T017 [P] RTL grep check — run `grep -r "pl-\|pr-\|ml-\|mr-\| left-\| right-\|text-left\|text-right\|border-l-\|border-r-" components/layout/LegalLayout.tsx app/\[locale\]/privacy/ app/\[locale\]/terms/ --include="*.tsx"` — must return zero matches
- [X] T018 [P] Verify `npm run build` completes without errors — MDX imports must resolve and TypeScript types must be satisfied for both page components
- [ ] T019 [P] Verify no noindex — view page source of `/privacy` and `/en/privacy` in the browser; confirm no `<meta name="robots" content="noindex">` tag is present; confirm `<title>` and `<meta name="description">` are correct
- [ ] T020 [P] Verify "Last updated" date update workflow — open `content/legal/privacy.ar.mdx`, change `lastUpdated` to `'2026-04-11'`, save; dev server hot-reloads; verify the new date appears on `/privacy`; revert the change
- [ ] T021 Run Lighthouse Accessibility on `http://localhost:3000/privacy` — target ≥ 95. Common issues: missing `lang` on `<html>` (handled by locale layout), heading levels skipped in MDX prose, insufficient contrast on `text-text-muted` against dark background
- [ ] T022 Run Lighthouse Accessibility on `http://localhost:3000/en/privacy` — target ≥ 95
- [X] T023 [P] Verify footer links work in both locales per quickstart.md Check 7

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 and T002 (installs) run first; T003 depends on them; T004–T007 run in parallel after installs.
- **Foundational (Phase 2)**: Depends on Phase 1 complete — T008 (LegalLayout) requires prose classes from typography plugin.
- **US1+US2 (Phase 3, P1)**: Depends on Phase 2 complete — Hero pages. T010 and T011 can run in parallel; T012 depends on both.
- **US3 (Phase 4, P2)**: Depends on Phase 2 complete — T013 and T014 can run in parallel; T015 depends on both. Can be built in parallel with Phase 3 if Phase 2 is done.
- **US4 (Phase 5, P2)**: Depends only on Phase 2 (LegalLayout exists) and the footer having the legal links — can start after Phase 2.
- **Polish (Phase 6)**: Depends on all page phases complete.

### Parallel Opportunities

```bash
# Phase 1 (after T001+T002+T003):
T004  # mdx-components.tsx
T005  # globals.css prose overrides
T006  # messages/ar.json legal namespace
T007  # messages/en.json legal namespace

# Phase 3 (US1+US2):
T010  # privacy.ar.mdx
T011  # privacy.en.mdx
# T012 (page.tsx) depends on both — run after

# Phase 4 (US3, parallel with Phase 3 after Phase 2):
T013  # terms.ar.mdx
T014  # terms.en.mdx
# T015 depends on both — run after

# Phase 6 (after all pages complete):
T017  # RTL grep
T018  # build check
T019  # noindex verification
T020  # last-updated workflow
T023  # footer links
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 (Setup) — installs and config
2. Complete Phase 2 (Foundational) — LegalLayout
3. Complete Phase 3 (US1+US2) — Privacy Policy page with full content
4. **STOP and VALIDATE**: Load `/privacy` — page renders, children's section exists, URL submittable to Google Play Console
5. Deliver: Google Play Console privacy policy requirement satisfied

### Incremental Delivery

1. Setup + Foundational → MDX rendering infrastructure ready
2. Phase 3 → Privacy Policy live in both locales ✅ (Google Play can be submitted)
3. Phase 4 → Terms of Service live in both locales ✅
4. Phase 5 → Footer navigation wired ✅
5. Phase 6 → Lighthouse 95+ passes ✅

---

## Notes

- **`next-mdx-remote` is ARCHIVED** (2026-04-09) — only `@next/mdx` is used
- **Frontmatter**: JS exports (`export const frontmatter = {...}`), not YAML — @next/mdx does not parse YAML frontmatter natively
- **Static imports**: Both locale MDX files are imported statically in each page; locale is selected at runtime — avoids unreliable dynamic template-literal imports
- **No `'use client'`**: LegalLayout and both page components are pure Server Components
- **RTL prose**: `[dir="rtl"]` on `<html>` (set by the locale layout) causes the browser to flip list bullets and paragraph direction automatically; `[dir="rtl"] .prose { line-height: 1.8; }` adds Arabic-appropriate line spacing
- **Last updated date**: Stored in MDX frontmatter — one edit per document, no UI or API needed
- **Legal review**: Content is DRAFT — a professional review is required before production launch. Each MDX file opens with `{/* DRAFT — REVIEW BY A LAWYER BEFORE PRODUCTION */}`
- **Contact email**: `legal@arabsyntax.com` is a placeholder — replace before launch
