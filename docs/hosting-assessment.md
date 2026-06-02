# Hosting & Cloudflare Migration Assessment

Technical assessment of the site's architecture and a Firebase App Hosting →
Cloudflare migration evaluation. Findings are grounded in the actual codebase
and real production builds; cost figures are modeled estimates (public pricing
tiers + typical per-visitor request counts), not billed numbers.

_Last verified against `main` after the i3rab phase (5 PRs merged)._

## Architecture — Next.js feature usage

| Feature | Used? | Where / detail |
|---|---|---|
| **Server Actions** | ✅ 1 | `app/actions/contact.ts` (`'use server'`) — contact form. Uses `headers()`, Resend, Upstash. |
| **Middleware** | ✅ | `proxy.ts` — next-intl `createMiddleware` for locale routing. Per-request (Edge runtime). |
| **Route Handlers** | ❌ none | No `route.ts` anywhere. |
| **API Routes** | ❌ none | No `pages/api`. |
| **Edge Runtime** | ⚠️ implicit | No `export const runtime='edge'`. Only middleware runs on edge inherently. |
| **Node Runtime** | ✅ default | Pages/Server Action default to Node. `node:fs`/`path`/`process.cwd()` used **at build time only**. |
| **Image Optimization** | ✅ default | `next/image` in 5 components, local images, no custom config → default optimizer. |
| **Dynamic Rendering** | ❌ none | No `force-dynamic`. |
| **ISR** | ❌ none | No `revalidate`. |
| **SSR (per-request pages)** | ❌ none | Build shows zero `ƒ` page routes. |
| **SSG** | ✅ everything | 232 prerendered HTML pages; `dynamicParams=false` on lesson/i3rab slugs. |

**Required vs optional**

- **Required:** SSG (all content); the i18n **middleware** (the unprefixed-Arabic
  `as-needed` URL scheme depends on it — removing it changes every URL); the contact
  **Server Action** or a replacement; serving the `next/image` components.
- **Optional / degradable:** Upstash **rate-limiting** (code falls back to "allow" when
  absent or Redis is down); image **optimization** (could serve unoptimized);
  **framer-motion** (now an unused dependency — removable).

## Deployment compatibility

| Target | Works? | Notes |
|---|---|---|
| **Static Export (`output: export`)** | ❌ No | Hard blockers (Next 16 docs): **Server Actions** and **Middleware** unsupported; also default `next/image` optimizer. |
| **Cloudflare Pages (pure static)** | ⚠️ Only after rework | Requires replacing the Server Action (Pages Function / form service) **and** the middleware (switch to `always`-prefix + CF redirect — **changes Arabic URLs**, hurts SEO). |
| **Cloudflare Workers via OpenNext** (`@opennextjs/cloudflare`) | ✅ Yes | Recommended path. Keeps Server Actions, middleware, SSG, and `as-needed` URLs as-is. Needs `nodejs_compat`. |
| **Cloudflare Workers (hand-rolled)** | ❌ impractical | Not without OpenNext. |

**Code changes for Cloudflare (OpenNext):** add adapter + `wrangler` config +
`open-next.config.ts`, enable `nodejs_compat`, choose an image strategy
(optimizer/loader or `images.unoptimized`), wire env vars. No application logic changes.

## Runtime requirements

- **Node APIs in the request path: none.** `fs`/`path`/`process.cwd()` appear only in
  `lib/lessons/loader.ts` and `lib/i3rab/loader.ts`, executed **at build time** during
  SSG prerender. At runtime only the Server Action runs (`headers()`, Resend, Upstash).
- **Package compatibility (all fetch-based / edge-friendly):** `@upstash/ratelimit` +
  `@upstash/redis`, `resend`, `next-intl`, `react-hook-form`, `zod`, `lucide-react`,
  `clsx`, `tailwind-merge`, `@next/mdx` (build-time). No native Node modules. No
  Cloudflare blockers. `framer-motion` is unused.

## Server features

- **Contact form / Server Action:** `submitContact` → Zod validate → honeypot →
  `checkRateLimit(ip)` (Upstash sliding window 5/h) → `sendContactEmail` (Resend). IP
  from `x-forwarded-for`.
- **Replaceable with:** a Cloudflare Worker/Pages Function calling **Resend directly**
  (just `fetch`), or a third-party form service. Not tied to Next internals beyond
  `headers()`.
- **Upstash usage:** rate-limiting only (one `Ratelimit` instance). Optional.

## Build & performance

- **Pages:** 232 prerendered HTML files (+ `sitemap.xml`, `robots.txt`,
  `manifest.webmanifest`). Includes lessons/[slug] ×100 and i3rab/[slug] ×118.
- **JS bundle:** `.next/static` ≈ 1.4 MB; JS ≈ 1.0 MB total across chunks (first-load
  shared is a fraction, ~120 KB-class baseline).
- **Static assets (`public/`):** **18 MB / 17 files**, lopsided: `examples.png` 6.3 MB,
  `quiz.png` 5.2 MB, `lesson.png` 4.9 MB, `content.png` 1.2 MB. Unoptimized screenshots
  — the biggest payload concern on any host.
- **Static vs server-rendered:** ~100% static. Only server execution is per-request
  middleware (locale routing) + the contact POST. No SSR, no ISR.

## Cost analysis (modeled)

Assume ~6 HTML views/visitor; assets cached at the edge after first hit; Cloudflare
egress is free.

| Visitors/mo | ~HTML/Worker requests | Resend emails | Cloudflare free tier? |
|---|---|---|---|
| 1,000 | ~6k | a handful | ✅ trivially |
| 10,000 | ~60k | tens | ✅ comfortably |
| 100,000 | ~600k–1M | ~hundreds | ✅ very likely (Workers free ≈ 3M/mo; paid $5 for 10M) |

- **Workers free:** ~100k req/day (~3M/mo) — covers ~100k visitors; spikes stay under the $5 tier.
- **Resend free:** 3,000 emails/mo. **Upstash free:** 10k cmd/day. Both negligible here.
- **Bandwidth:** Cloudflare doesn't bill egress (the 18 MB image set costs nothing there,
  but still hurts load time — optimize anyway).
- **Free tier sufficient?** Yes, almost certainly, through 100k visitors/mo. Only optional
  paid item is Cloudflare Images/Polish.

## Migration plan (OpenNext → Cloudflare Workers)

Keeps every feature and URL identical.

1. **Cleanup (~15 min):** remove unused `framer-motion`; **compress/resize the
   screenshots** (6 MB PNGs → ~150–300 KB WebP) — biggest win, host-independent.
2. **Add adapter (~30 min):** `@opennextjs/cloudflare`, `wrangler`; create
   `wrangler.jsonc` (name, `compatibility_flags: ["nodejs_compat"]`, assets) +
   `open-next.config.ts`.
3. **Image strategy (~30 min):** configure OpenNext image handling or
   `images.unoptimized: true` (acceptable once sources are pre-optimized).
4. **Env (~10 min):** `RESEND_API_KEY`, `SUPPORT_EMAIL`, `UPSTASH_*`,
   `NEXT_PUBLIC_SITE_URL` as Worker secrets/vars.
5. **Build & deploy (~20 min):** `opennextjs-cloudflare build` → `wrangler deploy`.
6. **Verify (1–2 h):** locale routing (`/` Arabic, `/en`), contact form end-to-end,
   sample SSG pages, canonical/hreflang (incl. i3rab → Arabic canonical), `sitemap.xml`,
   404s.
7. **Cutover:** DNS to Cloudflare.

- **Effort:** ~½–1 day. **Risk:** low-to-moderate — main risks are image-optimization
  behavior and Server-Action/middleware parity under OpenNext (well-supported; test the
  form). Reversible until DNS flips.

## Final recommendation

Migrating to Cloudflare via OpenNext is a **good, low-risk fit — but it's a
cost/performance optimization, not a fix for any blocker.** Nothing is broken on Firebase.

- **Cloudflare (OpenNext/Workers) — recommended to optimize cost/latency.** A ~100%-static
  site with one form + i18n middleware is the ideal Workers workload: no cold starts,
  global edge, free egress, likely **$0/mo** at this scale (vs Firebase App Hosting's
  Cloud Run compute + cold starts). Keeps all URLs/SEO intact.
- **Stay on Firebase App Hosting — fine if "don't fix what isn't broken" wins.** Works
  today; small cost delta at low traffic; migration is optional.
- **Vercel — best Next.js DX** but unnecessary here, and pricing/commercial terms are less
  favorable than Cloudflare's free tier for an SEO content site.

**Bottom line:** optimizing for cost/global performance → move to Cloudflare via OpenNext
(~½-day, likely free at scale). Valuing zero migration effort → staying on Firebase is
defensible. Either way, **compress the 4–6 MB screenshots** — highest-impact change on any
platform.
