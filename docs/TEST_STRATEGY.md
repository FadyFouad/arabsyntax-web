# Test Strategy & Risk Report — arabsyntax-web

_Senior QA / Security / Architecture review. Goal: surface bugs, crashes, security
issues, and production failures — not coverage percentages._

## 1. What this app actually is (scope reality check)

This is a **statically-rendered bilingual (ar/en) content + marketing site** for an
Arabic-grammar mobile app, built on **Next.js 16 / React 19 / next-intl 4**, deployed
to **Cloudflare Workers via OpenNext**.

A large part of the generic "test everything" checklist **does not apply here**, and a
credible strategy says so instead of inventing tests for surfaces that don't exist:

| Requested area | Status in this codebase |
| --- | --- |
| Authentication / sessions / tokens / roles | **N/A** — no auth, no accounts, no login |
| Payments / orders / duplicate-payment | **N/A** — no commerce (Play/App Store handle purchases off-site) |
| Database (transactions, constraints, concurrent updates) | **N/A** — no DB; content is JSON/MDX files in the repo |
| File uploads | **N/A** — none |
| Background jobs / queues | **N/A** — none |
| NoSQL/SQL injection | **N/A** — no query layer (the only datastore is Upstash Redis, keyed by a sanitized IP) |
| Password reset / signup / logout | **N/A** — no user lifecycle |

**The entire dynamic attack/failure surface is one feature:** the **contact form**
(`/support`) → `submitContact` server action → Zod validation → Upstash rate-limit →
Resend email. Everything else is read-only rendering of repo-controlled content.

Testing is therefore concentrated where real risk lives: **the contact pipeline, the
content loaders (untrusted route params → filesystem), and the SEO/JSON-LD output.**

## 2. Test inventory

### Unit / Integration (Vitest, `npm test`) — 282 tests, all green

| File | Target | Why it exists (risk covered) |
| --- | --- | --- |
| `test/contact-action.test.ts` 🆕 | `submitContact` server action | The only mutating surface. Pins control-flow order (validate → honeypot → rate-limit → send), and that **no side effect runs on a failed gate**. |
| `test/contact-validation.test.ts` 🆕 | `contactSchema` | Trust boundary. Min/max bounds, malformed emails, **CRLF header-injection in email**, Arabic/unicode/emoji acceptance, honeypot, type-coercion guards. |
| `test/resend-email.test.ts` 🆕 | `sendContactEmail` | **Stored XSS** into the support inbox (HTML escaping), **email header injection** (CRLF in replyTo/subject), missing-API-key fail-fast, error/throw degradation, no PII in logs. |
| `test/i3rab-loader.test.ts` 🆕 | i3rab loader | Slug↔filename invariant, grouping, misc-group-last, dedup, lesson cross-linking, null/adversarial slugs don't throw. |
| `test/lessons-loader-resolution.test.ts` 🆕 | `getLesson` resolution | EN-overlay field fallback, **table overlay dropped on dimension mismatch**, unknown-section dropping, description derivation, AR-only fallback, caching. (fs-mocked.) |
| `test/content-integrity.test.ts` 🆕 | All 50 lessons + EN overlays + 60 i3rab files + manifest | **Regression guard** — a malformed content file would ship a 500 / missing page. Validates every file against its schema; checks slug↔filename, uniqueness, URL-safe charset. |
| `test/i18n-parity.test.ts` 🆕 | `messages/ar.json` ↔ `messages/en.json` | Pins both locales to the same key shape, no blank values, and that every **dynamically-built** contact-form error code (`support.form.errors.<code>`) resolves in both — a missing key would render a raw code to users. |
| `test/theme.test.ts` 🆕 | `lib/theme` | `isThemeChoice` rejects tampered localStorage; boot script has try/catch and can't break out of `<script>`. |
| `test/supportConfig.test.ts` 🆕 | email env resolution | Safe fallbacks (never a personal inbox), visible warning on missing `RESEND_FROM_EMAIL`, fail-fast on missing key. |
| `test/lessons-loader.test.ts` ✅ | slug path-traversal guard | (pre-existing) `../`, separators, `.`, charset. |
| `test/clientIp.test.ts` ✅ | `pickClientIp` | (pre-existing) anti-spoof IP selection. |
| `test/ratelimit.test.ts` ✅ | `checkRateLimit` | (pre-existing) fail-closed when Redis errors. |
| `test/jsonLd.test.ts` ✅ | `serializeJsonLd` | (pre-existing) `<` escaping vs `</script>` breakout. |

### End-to-End (Playwright, `npm run test:e2e`) — **229 passing** (chromium + mobile-chrome)

One-time install:

```bash
npm i -D @playwright/test
npx playwright install chromium   # webkit NOT needed — see mobile note below
npm run test:e2e                  # builds the prod site, serves it, sweeps both projects
```

These specs were written against the source, then **actually run and reconciled** —
the full suite is green from a clean build (`npm run build` → `next start` → sweep,
~40s). Two projects: desktop **chromium** and **mobile-chrome** (Pixel 5).

| File | Coverage |
| --- | --- |
| `e2e/smoke.spec.ts` | All 12 pages (ar+en) return 200, correct `dir`/`lang`, header/main/footer present, **zero console/page errors** (modulo the documented http-only `upgrade-insecure-requests` artifact); 404s for unknown route / `/.env` / unknown lesson & i3rab slugs. |
| `e2e/navigation.spec.ts` | Index→detail drill-down (lessons, i3rab), locale switch preserves route, browser back/forward, header links (desktop), mobile menu (mobile). |
| `e2e/contact-form.spec.ts` | Client validation blocks empty/bad submits, success/`rate_limited`/`send_failed` UI (action mocked with the **real two-row Flight wire format**), **double-click does not double-send**, honeypot hidden. |
| `e2e/seo-and-theme.spec.ts` | canonical/OG/JSON-LD validity + no `</script>` breakout, hreflang alternates, robots/sitemap reachable, theme no-FOUC + persistence + **tampered-localStorage fallback**. |
| `e2e/prerender-completeness.spec.ts` 🆕 | **Every** lesson slug (ar+en) and i3rab slug renders 200 with a non-empty `<h1>`. Guards the SSG path that broke in PR #19. Slugs derived from manifest + content dir; chromium-only sweep. |

**Notes from the first real run** (each is in the spec as a comment):
- The browser locale is pinned to `ar` (`use.locale`) — with `localePrefix: 'as-needed'`
  + next-intl detection, an `en` Accept-Language redirects the unprefixed routes to
  `/en`, so without this the "Arabic page" assertions would test English pages.
- The mobile project is **Mobile Chrome**, not iPhone/webkit: the prod CSP sends
  `upgrade-insecure-requests`, and webkit (unlike chromium) has no localhost carve-out,
  so over the http test server it upgrades every asset to https and the page can't load.
  Chromium exempts localhost, so mobile viewport + touch + `MobileMenu` are exercised
  without serving https. (True Safari-engine testing needs an https preview — see High #1.)
- The smoke "zero console errors" check filters `ERR_SSL_PROTOCOL_ERROR`/`ERR_ABORTED`,
  which are http-harness artifacts of that same CSP + Next route prefetching, not app bugs.

## 3. Risk Report

### 🔴 Critical
_None outstanding._ The historically dangerous spots are already defended **and now
regression-locked by tests**: path traversal in loaders, JSON-LD script breakout,
rate-limit fail-closed, IP-spoof resistance, email HTML-escaping + header normalization.

### 🟠 High

1. **Runtime/deployment boundary is untested — the single biggest blind spot.** All 282
   unit tests run in Vitest's **node** env, and the Playwright config drives `next start`
   (**also Node**). Production runs on **Cloudflare Workers (workerd) via OpenNext** — a
   different runtime. A bug that only manifests there (unbound env var, a Node API workerd
   lacks, SDK runtime differences) passes everything here and still 500s in prod. This is
   not hypothetical: `layout.tsx` documents observed "intermittent 500 on
   OpenNext/Cloudflare" for metadata route handlers.
   → **Recommended (needs your setup decision)**: point a Playwright smoke project at
   `opennextjs-cloudflare preview` (workerd) or `wrangler dev` instead of `next start`,
   sweep the 12-page set, and run one real contact submit with test `RESEND_*`/`UPSTASH_*`
   secrets. Only this catches runtime-divergence and env-binding failures.
2. **No automated test ran against the contact pipeline before this work.** The single
   mutating surface (spam, deliverability, rate-limit bypass) was unverified.
   → **Fixed**: `contact-action`, `resend-email`, `contact-validation` suites added.
3. **Content files could break production silently.** Every page is file-driven; one bad
   JSON file = a 500 or vanished page, caught only in browser.
   → **Fixed**: `content-integrity.test.ts` validates all 110+ files in CI. **Wire this
   into the deploy gate** (it currently only runs via `npm test`).
4. **SSG prerender regressions (history: PR #19 broke prerendered detail pages).**
   → **Fixed**: `e2e/prerender-completeness.spec.ts` 200-checks every known slug.

### 🟡 Medium

3. **Dead honeypot branch (logic smell).** In `submitContact`, the `if (website) return
   {success:true}` "silent accept" is **unreachable**: `contactSchema` has
   `website: z.string().max(0)`, so any filled honeypot fails validation *first* and
   returns `validation_error`. Spam is still blocked (no email), but not *silently* — a
   bot can detect the honeypot, and the branch misleads readers.
   → **Recommendation**: either drop `website` from the schema (let the action's honeypot
   own it) or delete the dead branch. Documented in `contact-action.test.ts`.
4. **`withUnderlines` / `attributionCaption` (in `LessonSections.tsx`) are untestable.**
   They are module-private and mix pure logic with JSX. `withUnderlines` builds a
   `RegExp` from content tokens — it *does* escape regex metachars (good), but the logic
   has zero direct tests.
   → **Recommendation**: export both (pure parts) for unit testing, or extract to
   `lib/lessons/render.ts`. Same for `metaDescription`, duplicated verbatim in the lesson
   and i3rab page files.
   _(i18n key parity — a missing dynamically-built error key would show users a raw code —
   is now guarded by `i18n-parity.test.ts`.)_
5. **No component-render layer in unit tests.** `jsdom`/Testing-Library is not installed,
   so client components (`ContactForm`, `MobileMenu`, `ThemeToggle`) are only covered at
   the E2E level. Acceptable for a site this size, but interaction edge cases (focus
   trap, `aria-live` announcements) rely on Playwright being run.
   → **Recommendation**: add `@vitest/browser` or `jsdom + @testing-library/react` if
   client-component logic grows.

### 🟢 Low

6. **Server-Action E2E mock is Next-version-sensitive.** _(Resolved for Next 16.2.6.)_
   The first real run proved the naive `0:{json}` shape was wrong: a live action response
   is **two rows** — `0:` is a wrapper whose `a` field is a lazy reference (`$@1`) to the
   return value in row `1:`. `flight()` now emits that exact shape and the success/error
   UI renders correctly. This remains the one spot to re-verify on a major Next upgrade;
   the client-validation tests are version-independent. For true end-to-end delivery, run
   against a staging env with test `RESEND_*`/`UPSTASH_*` secrets.
7. **`resolveExampleItems` / EN list-overlay** positional index-matching is covered for
   tables but only lightly for examples/lists. Low impact (render-only fallback to AR).
8. **`connection()` in `/support`** forces the page dynamic; if that import/behavior
   regresses the form could be statically cached. Not currently asserted — covered
   indirectly by the form E2E.

## 4. Testability gaps & recommended hooks

- **Export pure helpers** (`withUnderlines`, `attributionCaption`, `metaDescription`,
  loader `normalizeTitle`) so render/format logic is unit-testable without a DOM.
- **Add `data-testid` or stable roles** to the theme toggle dropdown and mobile menu
  items to harden E2E selectors (currently text/regex-based across two locales).
- **CI wiring**: **done for the unit suite** — `.github/workflows/ci.yml` runs
  `npm ci → npm run lint → npm test` (282 tests incl. content integrity + i18n parity) on
  every push/PR to `main` (Node 22, ~1s). Still recommended: add an `npm run test:e2e`
  job (it builds + serves, ~40s + browser install) gated on `main`, ideally against an
  https preview so the mobile-safari/webkit path and `upgrade-insecure-requests` are
  exercised for real (see High #1).
- **No fixtures/factories were needed** for unit tests because the real content files are
  the fixtures; the fs-mock in `lessons-loader-resolution.test.ts` is the one place
  synthetic content is injected (for the mismatch/error branches the real data can't
  reach).

## 5. How to run

```bash
npm test            # 282 unit/integration tests (Vitest, node env) — ~0.8s
npm run test:watch  # watch mode
npm run test:e2e    # Playwright (after the install step in §2)
```
