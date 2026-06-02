# Al-Nahw Al-Kafi — Website

Marketing + content website for **Al-Nahw Al-Kafi (النحو الكافي)**, an Arabic-grammar
learning app. The site is a statically-rendered, bilingual (Arabic/English) Next.js
app that also publishes the app's grammar **lessons** and word-by-word **i'rab
(إعراب)** examples as indexable pages to grow Arabic-language SEO.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5, React 19 |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) |
| i18n | `next-intl` 4 — Arabic (default, unprefixed) + English (`/en`) |
| Content | JSON (lessons, i'rab) + MDX (legal pages) |
| Forms | React Hook Form + Zod, via a Server Action |
| Email | Resend (contact form) |
| Rate limiting | Upstash Redis |
| Validation | Zod |
| Hosting | Firebase App Hosting (Node runtime — see [Deployment](#deployment)) |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in values (see Environment)
npm run dev                  # http://localhost:3000
```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (prerenders all static pages) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint **+** the design-token governance check |
| `npm run check:tokens` | Run only the raw-color-literal check |

## Environment

Copy `.env.example` → `.env.local`.

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | yes (for contact form) | Resend API key for support emails |
| `SUPPORT_EMAIL` | yes (for contact form) | Destination address for the contact form |
| `UPSTASH_REDIS_REST_URL` | prod | Upstash Redis endpoint (contact-form rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | prod | Upstash Redis token |
| `NEXT_PUBLIC_SITE_URL` | prod | Canonical site origin (e.g. `https://…`). Defaults to `http://localhost:3000`; used for canonical/hreflang/OG/sitemap URLs. |

## Project structure

```
app/
  [locale]/              # all pages live under a locale segment (root layout owns <html lang/dir>)
    page.tsx             # landing page
    lessons/             # /lessons + /lessons/[slug]
    i3rab/               # /i3rab + /i3rab/[slug]
    privacy|terms|support/
  sitemap.ts             # enumerates all routes (incl. lessons & i'rab slugs)
  robots.ts
  manifest.ts            # PWA manifest
  globals.css            # Tailwind import + @theme design tokens
components/
  lessons/ i3rab/        # section renderers
  layout/ ui/ sections/ forms/ seo/
content/
  lessons/{ar,en}/*.json # 50 lessons per locale + manifest.json
  i3rab/ar/*.json        # i'rab sentences (filename = slug)
  legal/*.mdx            # privacy & terms (per locale)
lib/
  lessons/ i3rab/        # Zod schemas + loaders
  siteConfig.ts featureFlags.ts email/ ratelimit/ validation/
i18n/                    # next-intl routing + request config
messages/{ar,en}.json    # UI strings
docs/design-system.md    # token reference + component catalog
scripts/check-tokens.mjs # governance: blocks raw color literals
```

## Internationalization

- `next-intl` with `localePrefix: 'as-needed'`: **Arabic is the default and unprefixed**
  (`/`, `/lessons`), **English is prefixed** (`/en`, `/en/lessons`).
- Locale routing is handled by `proxy.ts` (next-intl middleware).
- `app/[locale]/layout.tsx` is the sole root layout and sets `<html lang dir>`
  (`rtl` for Arabic). UI strings live in `messages/{ar,en}.json`.

## Content sections

- **Lessons** (`/lessons`) — bilingual. Built from `content/lessons/{ar,en}/*.json`.
  Arabic is the structural source of truth; English is an overlay merged by section
  `id` with field-by-field fallback. Renders 8 section types (paragraph, example,
  heading, highlight, list, quote, question, table).
- **I'rab** (`/i3rab`) — **bilingual routing, Arabic content**. Built from
  `content/i3rab/ar/*.json` (one sentence per file, filename = slug). Pages exist at
  both `/i3rab/[slug]` and `/en/i3rab/[slug]`, but the sentence/words/i'rab/explanation
  stay Arabic on both — only the surrounding UI follows the locale. Both versions
  **canonicalize to the Arabic URL** to avoid duplicate content. Links to a related
  lesson when the lesson name matches (fails safe to plain text otherwise).
- **Legal** (`/privacy`, `/terms`) — MDX with frontmatter.
- **Support** (`/support`) — contact form (Server Action → Resend, rate-limited).

All content pages are statically generated (SSG) at build time. Adding/updating
content requires editing the JSON/MDX and redeploying.

## Design system

Tokens are the single source of truth in `app/globals.css` (`@theme`) — a dark,
WCAG-AA-verified palette built to be theme-ready (a light theme later = repopulating
values only). Text tokens are **solid composited hex** (never raw alpha), and the
Qur'an verse block, plain quote, and highlight callouts have dedicated tokens.

**Governance:** components and page render files must reference tokens only — no raw
`#hex` / `rgb()` / `hsl()`. This is enforced by `scripts/check-tokens.mjs`, wired into
`npm run lint`. Full reference and component catalog: [`docs/design-system.md`](docs/design-system.md).

## SEO

- `<html lang/dir>`, canonical + `hreflang` (`ar` / `en` / `x-default`) on every page.
- JSON-LD: an Organization + WebSite + SoftwareApplication graph site-wide, and
  `LearningResource` on lessons & i'rab pages.
- OpenGraph + Twitter card metadata, PWA `manifest.ts`, generated `sitemap.ts` /
  `robots.ts`.

## Deployment

Deployed on **Firebase App Hosting** (Node runtime). The site is **not** a pure static
export: it uses Server Actions (contact form) and next-intl middleware, both of which
require a server. Content pages are still statically prerendered (SSG), so they ship as
crawlable HTML. Set `NEXT_PUBLIC_SITE_URL` and the Resend/Upstash env vars in the
hosting environment.

```bash
npm run build
```

## Conventions

- Branch each change off `main`; open a PR; keep unrelated work in separate PRs.
- Run `npm run lint` (ESLint + token check) and `npm run build` before opening a PR.
- Don't introduce raw color literals in components — use design tokens.
