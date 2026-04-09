<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0
New constitution — initial ratification.

Added sections:
  ✅ Core Principles (I–VI)
  ✅ Tech Stack
  ✅ SEO Requirements
  ✅ File Structure & Naming Conventions
  ✅ Workflow & Definition of Done
  ✅ Out of Scope for v1
  ✅ Terminology
  ✅ Governance

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gates now reflect
     RTL discipline, Server-First, Tailwind logical-properties, and locale checks.
     No structural change needed; gates are filled at plan time.
  ✅ .specify/templates/spec-template.md — No structural change needed; spec
     authors must validate against constitution during /speckit.specify.
  ✅ .specify/templates/tasks-template.md — Path conventions updated to match
     the App Router file structure defined here.

Deferred items:
  None — all fields resolved from user input.
-->

# ArabSyntax Marketing Website Constitution

## Core Principles

### I. Internationalization & RTL-First

Every page MUST exist in both Arabic (`ar`) and English (`en`). Arabic is the
default locale and MUST be served at the root path with no URL prefix. English
MUST be served under `/en`. The `next-intl` middleware MUST use
`localePrefix: "as-needed"`.

**RTL discipline is the rule most likely to be violated — enforce strictly:**

- Components MUST use Tailwind logical properties exclusively: `ps-*`, `pe-*`,
  `ms-*`, `me-*`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s-*`,
  `border-e-*`.
- Physical-direction utilities are FORBIDDEN in any component: `pl-*`, `pr-*`,
  `ml-*`, `mr-*`, `left-*`, `right-*`, `text-left`, `text-right`, `border-l-*`,
  `border-r-*`. The sole exception is a layout element that is provably
  direction-agnostic (e.g., a perfectly centered element).
- Directional icons (chevrons, arrows, "next" indicators) MUST visually flip in
  RTL, using `rtl:-scale-x-100` or a locale-driven icon swap.
- Two-column layouts MUST place the "primary" column at the `start` side.
- The `<html>` element MUST set `lang` and `dir` dynamically per active locale:
  `lang="ar" dir="rtl"` or `lang="en" dir="ltr"`.
- Every user-visible string MUST come from `messages/{locale}.json`. Hardcoded
  strings in JSX are FORBIDDEN except for the brand names "ArabSyntax" and
  non-translatable proper nouns.
- Internal navigation MUST use the `next-intl` Link component so locale is
  always preserved.
- Every component MUST be visually verified in both Arabic and English before
  being marked complete.

### II. Design System Discipline

The site uses a single dark theme matching the mobile app. There is NO light
mode in v1.

- Color tokens are defined as CSS custom properties in `app/globals.css` and
  exposed to Tailwind via `tailwind.config.ts` under `theme.extend.colors`.
  Refer to `design-tokens.md` in the repo root for exact values.
- Components MUST reference theme colors via Tailwind utilities (`bg-background`,
  `text-primary`, `border-border`, etc.). Hardcoded hex values are FORBIDDEN.
- Typography:
  - Arabic: Cairo (weights 400, 500, 600, 700), exposed as `--font-cairo`.
  - English: Inter (weights 400, 500, 600, 700), exposed as `--font-inter`.
  - Fonts MUST be loaded via `next/font/google`. External font CDNs and
    `@font-face` rules are FORBIDDEN.
  - Body font family MUST be set at the layout level based on the active locale.
- Spacing MUST follow Tailwind defaults. Arbitrary spacing values (e.g.,
  `p-[17px]`) are FORBIDDEN unless no standard token satisfies the requirement,
  and the exception MUST be documented.
- Border radius: cards MUST use `rounded-2xl`, buttons `rounded-xl`, inputs
  `rounded-lg`.

### III. Accessibility Standards (WCAG 2.1 AA)

Lighthouse Accessibility score MUST be 95 or higher on every page.

- Every interactive element MUST be keyboard-reachable with a visible focus
  state. Removing the focus outline without providing a fully accessible
  alternative is FORBIDDEN.
- Every form input MUST have an associated `<label>` with matching `for`/`id`.
- Every icon-only button MUST have an `aria-label`.
- Every image MUST have alt text written in the page's active locale.
- Color contrast MUST meet WCAG AA ratios against the dark background.
- All animations MUST respect `prefers-reduced-motion` via the
  `useReducedMotion` hook from `framer-motion`. `framer-motion` MUST NOT be
  used for decoration only; every animation MUST meaningfully improve UX.
- Heading hierarchy MUST be semantic: one `<h1>` per page, `<h2>` for sections,
  `<h3>` for subsections. Skipping heading levels is FORBIDDEN.

### IV. Performance Standards

Lighthouse Performance score MUST be 95 or higher on the landing page.
Core Web Vitals targets: LCP < 2.5 s, CLS < 0.1, INP < 200 ms.

- All images MUST use `next/image` with explicit `width` and `height`. Raw
  `<img>` tags are FORBIDDEN.
- The hero image (above the fold on the landing page) MUST use
  `priority={true}`. All other images lazy-load by default.
- React Server Components are the default. A `'use client'` directive MUST be
  justified in a code comment explaining which interactivity requires it.
  Client components MUST be small and isolated.
- Client-side data fetching for static content is FORBIDDEN.

### V. SEO Completeness

- Every page MUST export a `metadata` object with locale-specific `title` and
  `description`.
- Canonical URLs MUST be set on every page.
- `hreflang` alternates MUST link Arabic and English versions of each page.
- A `sitemap.ts` file MUST generate the sitemap for both locales.
- A `robots.ts` file MUST allow all crawlers and point to the sitemap.
- The landing page MUST include JSON-LD structured data using the
  `SoftwareApplication` schema.

### VI. Scope Discipline

The website's only purpose is to drive Google Play installs and host required
legal pages. It is NOT the app itself — no lesson content, no user accounts,
no in-browser learning experience.

Features excluded from v1 (require explicit written approval to add):

- User accounts or authentication on the website.
- A blog or CMS.
- Web version of the app or in-browser learning experience.
- Light mode / theme switching.
- Cookie consent banners (analytics MUST be cookie-free).
- A/B testing infrastructure.
- Newsletter signup.
- Live chat or ticketing system.
- File uploads in the contact form.
- CAPTCHA (honeypot + rate limit only, until proven insufficient).

## Tech Stack

The following choices are NON-NEGOTIABLE for this project:

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16, App Router, TypeScript |
| Build | Turbopack (dev default). Webpack fallback only if a dependency breaks. |
| Styling | Tailwind CSS. No CSS-in-JS, no styled-components, no CSS Modules unless unavoidable. |
| i18n | next-intl, `[locale]` App Router segment, `localePrefix: "as-needed"` |
| Fonts | next/font/google only |
| Icons | lucide-react |
| Animation | framer-motion, only where it meaningfully improves UX, gated on prefers-reduced-motion |
| Deployment | Vercel |

## SEO Requirements

See Principle V. Additionally:

- Every page MUST include `hreflang` alternates.
- The landing page MUST include `SoftwareApplication` JSON-LD.
- `sitemap.ts` and `robots.ts` MUST be maintained at the `app/` root.

## File Structure & Naming Conventions

All features MUST follow this layout:

```text
app/
  [locale]/
    layout.tsx           — sets html lang/dir, loads fonts, renders Header + children + Footer
    page.tsx             — landing page
    privacy/page.tsx
    terms/page.tsx
    support/page.tsx
    not-found.tsx
  api/                   — only if absolutely needed (prefer Server Actions)
  actions/               — Server Actions (e.g., contact form)
  globals.css            — Tailwind directives and CSS variables
  sitemap.ts
  robots.ts
components/
  layout/                — Header, Footer, LanguageSwitcher, LegalLayout
  sections/              — Hero, Features, HowItWorks, Screenshots, Pricing, Audiences, FAQ, FinalCTA
  ui/                    — Button, Card, Container, Accordion, SectionHeading, PlayStoreBadge, AppStoreBadge
  forms/                 — ContactForm
content/
  legal/                 — privacy.{ar,en}.mdx, terms.{ar,en}.mdx
i18n/
  routing.ts             — next-intl routing config
  request.ts             — next-intl request config
lib/
  cn.ts                  — classnames helper
  validation/            — zod schemas
  email/                 — Resend wrapper
  ratelimit.ts           — rate limiter
messages/
  ar.json
  en.json
public/
  badges/                — Google Play / App Store badges
  screenshots/           — app screenshots
  og/                    — Open Graph images
```

**Naming conventions:**

- Components: PascalCase files exporting a default component of the same name.
- Utilities and hooks: camelCase.
- Message keys: camelCase, nested by feature (e.g., `landing.hero.title`,
  `support.form.labels.email`).
- CSS variables: kebab-case with a category prefix (e.g., `--font-cairo`,
  `--color-primary`).

## Workflow & Definition of Done

Features MUST be built in the order: **Foundation → Landing → Legal → Support**
(as defined in `arabsyntax-speckit-prompts.md`).

A feature is ONLY "done" when ALL of the following are true:

1. It works correctly in both locales (Arabic and English).
2. Lighthouse Accessibility score is 95+ on the feature's primary page.
3. It is fully responsive from 320 px to 1920 px with no horizontal scroll.
4. It has been visually verified in both RTL (Arabic) and LTR (English).
5. All copy is real — not Lorem Ipsum. Placeholder values are acceptable only
   for prices, app screenshots, and legal text explicitly marked `DRAFT`.

Commit after each feature is complete.

## Terminology

Use the following terms consistently across all copy, specs, plans, and tasks:

| Concept | Arabic | English |
|---------|--------|---------|
| App name | النحو العربي | ArabSyntax |
| Subject area | النحو | Arabic grammar (never "Arabic syntax" in user-facing copy) |
| Primary audience | طلاب الثانوية العامة | Thanaweya Amma students / high school exam prep students |
| Premium features | الميزات المدفوعة | Premium features |
| Legacy purchasers | المستخدمون الذين اشتروا التطبيق سابقاً | Legacy purchasers |

## Governance

This constitution supersedes all other project conventions. Any conflict between
a spec, plan, task, or implementation decision and this constitution MUST be
resolved in favor of the constitution unless a formal amendment is approved.

**Amendment procedure:**

1. Propose the amendment in writing, identifying which principle or section is
   affected and why the change is needed.
2. Assess the version bump: MAJOR for backward-incompatible removals or
   redefinitions; MINOR for new principles or materially expanded guidance;
   PATCH for clarifications or wording fixes.
3. Update this file and regenerate the Sync Impact Report comment.
4. Commit with message: `docs: amend constitution to vX.Y.Z (<summary>)`.

**Compliance:**

- Every spec MUST be validated against this constitution before `/speckit.plan`
  is run.
- Every plan MUST include a Constitution Check gate before Phase 0 research.
- If a request conflicts with these rules, push back and ask for clarification
  rather than silently violating them.
- Violations found during review MUST be documented and resolved before the
  feature is marked done.

**Version**: 1.0.0 | **Ratified**: 2026-04-10 | **Last Amended**: 2026-04-10
