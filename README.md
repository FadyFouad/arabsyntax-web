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
| Hosting | Cloudflare Workers via OpenNext — see [Deployment](#deployment) |

## Getting started

```bash
nvm use
npm install
cp .env.example .env.local   # fill in values (see Environment)
npm run dev                  # http://localhost:3000
```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (prerenders all static pages) |
| `npm run build:worker` | Build the Cloudflare Worker output with OpenNext |
| `npm run start` | Serve the production build |
| `npm run preview` | Build and preview the Cloudflare Worker locally |
| `npm run deploy` | Build and deploy to Cloudflare Workers |
| `npm run deploy:prod` | Production deploy (alias for `npm run deploy`) — use this; the build auto-loads `.env.production` |
| `npm run upload` | Build and upload a Cloudflare Worker version without deploying |
| `npm run seo` | Generate `public/sitemap.xml` + `public/robots.txt` (runs automatically before dev/build/preview/deploy) |
| `npm run cf-typegen` | Generate Cloudflare binding types |
| `npm run lint` | ESLint **+** the design-token governance check |
| `npm run check:tokens` | Run only the raw-color-literal check |
| `npm test` | Vitest unit + integration suite (incl. content-integrity & i18n-parity regression guards) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Playwright end-to-end suite (builds + serves the prod site, sweeps chromium + mobile-chrome) |

## Environment

Copy `.env.example` → `.env.local`.

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | yes (for contact form) | Resend API key for support emails |
| `RESEND_FROM_EMAIL` | prod | Verified Resend sender address/domain |
| `SUPPORT_EMAIL` | yes (for contact form) | Destination address for the contact form |
| `UPSTASH_REDIS_REST_URL` | prod | Upstash Redis endpoint (contact-form rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | prod | Upstash Redis token |
| `NEXT_PUBLIC_SITE_URL` | prod | Canonical site origin (e.g. `https://…`). Defaults to `http://localhost:3000`; used for canonical/hreflang/OG/sitemap URLs. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | prod | Stable Server Actions encryption key across overlapping deployments |

For local Worker preview, copy `.dev.vars.example` to `.dev.vars` and fill in the same
runtime values. Keep `.env.local` and `.dev.vars` out of Git.

## Project structure

```
app/
  [locale]/              # all pages live under a locale segment (root layout owns <html lang/dir>)
    page.tsx             # landing page
    lessons/             # /lessons + /lessons/[slug]
    i3rab/               # /i3rab + /i3rab/[slug]
    privacy|terms|support/
    [...rest]/           # locale-scoped catch-all → not-found
    error.tsx not-found.tsx
  actions/contact.ts     # contact-form Server Action
  global-error.tsx       # root error boundary
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
public/                  # static assets + build-generated sitemap.xml, robots.txt, manifest.webmanifest
docs/design-system.md    # token reference + component catalog
scripts/
  check-tokens.mjs       # governance: blocks raw color literals
  generate-seo.mjs       # emits public/sitemap.xml + robots.txt at build time
test/                    # Vitest unit + integration tests
e2e/                     # Playwright end-to-end specs
playwright.config.ts     # Playwright config (chromium + mobile-chrome)
docs/TEST_STRATEGY.md    # test inventory + risk report
.github/workflows/ci.yml # CI: lint + tests (fast gate) and a separate E2E job
```

## Testing

- **Unit + integration** (`npm test`, Vitest, ~1s) — focused on the dynamic surface
  (contact pipeline: action control-flow, Zod validation, Resend escaping/headers) and the
  content loaders, plus two **regression guards**: `content-integrity` (every lesson/i'rab/
  manifest file validated against its schema) and `i18n-parity` (`ar.json` ↔ `en.json` key
  parity + every contact-form error code resolves). Specs in `test/`.
- **End-to-end** (`npm run test:e2e`, Playwright) — smoke, navigation, contact form,
  SEO/theme, and prerender completeness across **desktop chromium + mobile-chrome**. Specs in
  `e2e/`, config in `playwright.config.ts`. First run downloads the browser:
  `npx playwright install chromium`.
- **CI** (`.github/workflows/ci.yml`) — on every push/PR to `main`, a **fast gate**
  (`npm run lint` + `npm test`, the required check) runs alongside a separate **E2E** job.
- Full inventory + risk report: [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md).

## Internationalization

- `next-intl` with `localePrefix: 'as-needed'`: **Arabic is the default and unprefixed**
  (`/`, `/lessons`), **English is prefixed** (`/en`, `/en/lessons`).
- Locale routing is handled by `middleware.ts` (next-intl middleware). Next 16
  renamed this convention to `proxy.ts`, but `proxy.ts` is Node-only in this
  version; Cloudflare/OpenNext currently needs the Edge middleware path.
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
- OpenGraph + Twitter card metadata, plus a PWA `manifest.webmanifest`.
- `sitemap.xml` and `robots.txt` are generated as **static files** in `public/` by
  `scripts/generate-seo.mjs` (wired into the build/deploy scripts) and served by the
  Cloudflare ASSETS binding — the OpenNext worker handler intermittently 500'd on the
  old `app/sitemap.ts` / `app/robots.ts` metadata routes.

## Deployment

Deploy on **Cloudflare Workers** with `@opennextjs/cloudflare`. The site is **not** a
pure static export: it uses Server Actions (contact form), runtime support email config,
and next-intl proxy routing, which require a server/adapter runtime. Content pages are
still statically prerendered where possible, so they ship as crawlable HTML.

Full production checklist: [`plan/production-deployment-runbook.md`](plan/production-deployment-runbook.md).

Local production/Worker checks:

```bash
npm ci
npm run lint
npm run build
npm run preview
```

Production deploy:

```bash
npm run deploy:prod
```

`deploy:prod` is an alias for `deploy`; the production guarantee comes from the
gitignored `.env.production`, **not** the script name. The build-time vars
`NEXT_PUBLIC_SITE_URL` and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` live there, and both
`next build` and the `generate-seo.mjs` prebuild read it. Forgetting to set
`NEXT_PUBLIC_SITE_URL` is what previously shipped `http://localhost:3000` into the
sitemap, robots.txt, JSON-LD, and canonical URLs. Copy `.env.example` to
`.env.production` and fill in the production values on a new machine.

Before production, choose the final domain/canonical host, attach a Cloudflare Worker
Custom Domain, verify HTTPS, configure the secondary host redirect, and verify Resend
and Upstash with real credentials.

Set Cloudflare runtime secrets before deploying:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npx wrangler secret put SUPPORT_EMAIL
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
npx wrangler secret put NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
```

The current CI (`.github/workflows/ci.yml`) runs only lint, tests, and E2E — it does **not**
deploy, so it needs no Cloudflare credentials. Deploys are run manually with `npm run deploy`.
A future deploy job would need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
Image optimization is intentionally disabled in `next.config.ts`; current public assets are
small and served directly. Add a Cloudflare Images binding later if optimized image
transforms become necessary.

## Conventions

- Branch each change off `main`; open a PR; keep unrelated work in separate PRs.
- Run `npm run lint` (ESLint + token check) and `npm run build` before opening a PR.
- CI gates every PR with `npm run lint` + `npm test` (the required **Lint & test** check),
  plus a separate Playwright E2E job.
- Don't introduce raw color literals in components — use design tokens.

## Contributors

<table>
  <tr>
    <td align="center"><a href="https://github.com/ahmedfarag9"><img src="https://wsrv.nl/?url=https://avatars.githubusercontent.com/u/44787287?v=4&w=100&h=100&fit=cover&mask=circle" width="100px;" alt=""/><br /><sub><b>Ahmed Farag</b></sub></a><br /> </td>
    <td align="center"><a href="https://github.com/FadyFouad"><img src="https://wsrv.nl/?url=https://avatars.githubusercontent.com/u/26604339?v=4&w=100&h=100&fit=cover&mask=circle" width="100px;" alt=""/><br /><sub><b>Fady Fouad</b></sub></a><br /> </td>
  </tr>
</table>
