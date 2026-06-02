# Data Model: Launch Polish — Real Brand, Real App

**Branch**: `005-launch-polish` | **Date**: 2026-04-12
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

## Overview

This feature is a content-and-refactor pass. It introduces **no runtime
storage**, **no database**, and **no new API**. The "data model" is
therefore a set of **build-time, statically typed constants** that become
the single source of truth for every surface that had previously
hardcoded brand, store, rating, or developer strings.

All entities in this document are TypeScript `const` values — they do
not cross a network boundary, they have no CRUD lifecycle, and they are
resolved at build time. They exist so that a future brand or rating
change is a one-file edit rather than a repo-wide grep.

## Entities

### 1. `SiteConfig` — Brand, Developer, Store, Rating, Canonical URL

**Location**: `lib/siteConfig.ts`
**Shape**: `as const` literal object — fully type-narrowed.
**Consumers**: `components/sections/Hero.tsx`,
`components/layout/Header.tsx`, `components/layout/Footer.tsx`,
`components/ui/PlayStoreBadge.tsx`, `components/ui/AppStoreBadge.tsx`,
`components/seo/StructuredData.tsx`, `app/sitemap.ts`, `app/robots.ts`,
`app/[locale]/layout.tsx`, `app/[locale]/page.tsx`,
`app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`,
`app/[locale]/support/page.tsx`, `lib/email/resend.ts`.

```ts
export const siteConfig = {
  name: {
    en: "Al-Nahw Al-Kafi",
    ar: "النحو الكافي",
  },
  developer: {
    name: "ETA TECH",
    contact: "Fady Fouad",
    email: "fady.fouad.a@gmail.com",
  },
  stores: {
    googlePlay: "https://play.google.com/store/apps/details?id=com.etateck.arabsyntax",
    appStore:   "https://apps.apple.com/us/app/%D8%A7%D9%84%D9%86%D8%AD%D9%88-%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/id6448959921",
  },
  rating: {
    stars: 4.7,
    reviewCount: 2600,
    source: "Google Play",
  },
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export type SiteConfig = typeof siteConfig;
```

**Field rules and invariants**:

| Field | Type | Rule |
|---|---|---|
| `name.en` | string literal | MUST be `"Al-Nahw Al-Kafi"` — the only allowed English form. Never abbreviate. |
| `name.ar` | string literal | MUST be `"النحو الكافي"` — no diacritics, no bracketed Latin. |
| `developer.name` | string literal | `"ETA TECH"` — appears in copyright, `author` JSON-LD, and Resend from-name. |
| `developer.email` | string literal | `"fady.fouad.a@gmail.com"` — appears in privacy/terms, FAQ, and Resend reply-to. |
| `stores.googlePlay` | URL string | Contains legacy Android package ID `com.etateck.arabsyntax` — DO NOT rewrite during rebrand (FR-004). |
| `stores.appStore` | URL string | Contains URL-encoded Arabic `النحو-الكافي` plus numeric App Store ID `6448959921`. |
| `rating.stars` | number | `4.7` — consumed as `"4.7"` string by JSON-LD `AggregateRating.ratingValue`. |
| `rating.reviewCount` | number | `2600` — consumed as `"2600"` string by JSON-LD `AggregateRating.reviewCount`. Spec renders "2,600+" (EN) / "٢٬٦٠٠" (AR) but the underlying number is the same. |
| `rating.source` | string literal | `"Google Play"` — surface label, not a URL. |
| `url` | URL string | Canonical site URL. Env var wins; `localhost:3000` is the dev fallback. Consumed by `metadataBase`, sitemap, robots, canonical tags, OG URL. |

**Immutability**: `as const` ensures every field is narrowed to its
literal type. A typo in a consumer (`siteConfig.name.EN` vs
`siteConfig.name.en`) becomes a compile error.

**No runtime validation**: Values are owned by the developer, not by
user input — schema validation (zod, etc.) would be ceremony without
benefit.

---

### 2. `FeatureFlags` — Gated UI Sections

**Location**: `lib/featureFlags.ts`
**Shape**: `as const` boolean map.
**Consumers**: `app/[locale]/page.tsx`, `components/layout/Header.tsx`,
`components/layout/Footer.tsx`.

```ts
export const featureFlags = {
  showPricing: false,
} as const;

export type FeatureFlags = typeof featureFlags;
```

**Semantics**:

- `showPricing = false` (default for this feature): the `<Pricing />`
  section is not rendered on the landing page; the Pricing nav link is
  filtered out of the header nav array; the Footer Product column drops
  its Pricing link; `<FreeCallout />` renders in the same slot Pricing
  used to occupy.
- `showPricing = true` (restoration path): every gated surface restores
  to its pre-feature behavior. Preserved message keys
  (`landing.pricing.*`) and the unchanged `components/sections/Pricing.tsx`
  are the contract guaranteeing restoration is a one-line flag flip.

**Invariant**: The Pricing section and its message keys MUST remain
byte-identical to their pre-feature form. Any refactor of Pricing belongs
in a separate feature.

**Why a module and not an env var**: The flag is a code decision, not a
per-environment decision. A constant lets TypeScript narrow branches at
build time — dead code elimination removes the Pricing component from
the client bundle when the flag is false.

---

### 3. `BrandIdentity` (derived view) — Per-locale Display Strings

**Location**: Not a standalone file; derived at call sites from
`siteConfig.name[locale]`.

| Locale | `name` | `dir` | `lang` | Notes |
|---|---|---|---|---|
| `ar` | `"النحو الكافي"` | `"rtl"` | `"ar"` | Served at `/`. |
| `en` | `"Al-Nahw Al-Kafi"` | `"ltr"` | `"en"` | Served at `/en`. |

`dir` and `lang` are owned by `app/[locale]/layout.tsx` (unchanged from
Feature 001). This entity documents only the brand-form binding to
`locale`.

---

### 4. `AggregateRating` (derived view) — Per-locale Social-Proof Line

**Location**: Composed in `messages/{locale}.json` at
`landing.hero.socialProof`; source values live in `siteConfig.rating`.

| Locale | Rendered line |
|---|---|
| `en` | `★ 4.7 · 2,600+ reviews on Google Play` |
| `ar` | `★ ٤٫٧ · أكثر من ٢٬٦٠٠ تقييم على Google Play` |

**Field mapping to JSON-LD `AggregateRating`**:

```json
{
  "@type": "AggregateRating",
  "ratingValue": "4.7",
  "reviewCount": "2600",
  "bestRating": "5",
  "worstRating": "1"
}
```

**Digit policy**: Arabic uses Arabic-Indic digits (`٤٫٧`, `٢٬٦٠٠`) in
the visible line; English uses Western digits with a thousands comma
(`2,600`). JSON-LD always uses Western digits (Google's schema
validator rejects Arabic-Indic).

---

### 5. `DataSafetyDeclaration` — Google Play Alignment Record

**Location**: `content/legal/privacy.{en,ar}.mdx` (rewritten by this
feature). Source of truth for the *underlying facts*: the live Google
Play Data Safety declaration for `com.etateck.arabsyntax`.

**Declared facts** (mirrored verbatim in policy sections):

| Fact | Value |
|---|---|
| Data collection by developer | None directly |
| Data types shared with third parties | App activity · App info and performance · Device or other IDs |
| Purpose of sharing | Analytics and crash reporting |
| Encryption in transit | No |
| Data deletion mechanism | None automated; contact developer |
| Suitable for minors | Yes (general audience) |
| Contact email | `fady.fouad.a@gmail.com` |

**Rule**: If any field above ever changes on the live Play listing, the
MDX files MUST be updated in the same PR. This rule is enforced by
manual review — there is no automated diff because the source is an
external, human-maintained Google Play form.

**Cross-document sync**: Section 2 ("Information We Collect") of the
privacy policy MUST mention the three data categories above with the
same wording the Play Store uses. Divergence is a compliance bug, not a
copy preference.

---

### 6. `LaunchTodoRecord` — Deferred Pre-Launch Items

**Location**: `LAUNCH_TODO.md` at repo root (new file).
**Shape**: Unstructured Markdown checklist — NOT YAML, NOT JSON.
Consumed by humans, not by build tooling.

**Required entries**:

```markdown
# Launch TODO

Deferred from feature 005-launch-polish. These items are NOT blockers
for landing the feature, but MUST be resolved before publicly linking
the site from the Google Play / App Store listings.

- [ ] **OG image rebrand** — `public/og/og-image.png` (1200×630 PNG,
      dark theme) currently shows the placeholder brand. Regenerate
      with "النحو الكافي / Al-Nahw Al-Kafi" and drop in place. No
      code changes needed — `metadata.openGraph.images` already points
      at this path.
- [ ] **Constitution §Terminology amendment** — The constitution's
      Terminology table still lists "ArabSyntax" / "النحو العربي" and
      references "Premium features" / "Legacy purchasers" rows that
      are obsolete after this feature. Run `/speckit.constitution` to
      apply a patch-level update (v1.0.2) replacing the three rows.
      Deviation is documented in `specs/005-launch-polish/plan.md` →
      Constitution Check.
- [ ] **FAQ `offline` answer** — Confirm with developer whether
      offline use is supported, then finalize the `faq.offline.a` key
      in `messages/{ar,en}.json`. Current copy is a TODO placeholder.
```

**Lifecycle**: Entries are added by this feature; they are removed in
follow-up commits when each item is actually done. The file is
committed, not gitignored — visibility over tidiness.

---

## Relationships

```
siteConfig ──── consumed by ────▶ Hero, Header, Footer, Badges,
                                  StructuredData, sitemap, robots,
                                  layout metadata, page metadata,
                                  Resend sender, support page

siteConfig.name[locale] ────────▶ BrandIdentity (derived)

siteConfig.rating ──────────────▶ AggregateRating (derived) ─────▶
                                  - hero social-proof line (via messages)
                                  - JSON-LD AggregateRating block

featureFlags.showPricing ──gates▶ <Pricing /> render
                          ──gates▶ nav.pricing link in Header
                          ──gates▶ footer.product.pricing link

DataSafetyDeclaration ─mirrored▶  privacy.{en,ar}.mdx sections 2–5

LaunchTodoRecord ──────documents▶ OG image regeneration
                  ──────documents▶ constitution v1.0.2 amendment
                  ──────documents▶ FAQ offline confirmation
```

## Invariants and Validation

| Invariant | Enforcement |
|---|---|
| `siteConfig.name.en === "Al-Nahw Al-Kafi"` | TypeScript literal type; manual code review. |
| `siteConfig.name.ar === "النحو الكافي"` | TypeScript literal type; manual code review. |
| No user-visible `"ArabSyntax"` literal remains outside `siteConfig.stores.googlePlay` | `quickstart.md` grep gate. |
| `featureFlags.showPricing === false` at launch | Code review; default in `lib/featureFlags.ts`. |
| Privacy policy matches Google Play Data Safety declaration | Manual diff by human reviewer before launch. |
| JSON-LD `SoftwareApplication` validates | Google Rich Results Test (manual step in quickstart). |

## Out of Scope

- **No mutable state**. This feature introduces no database, no
  localStorage, no cookies, no sessionStorage.
- **No i18n for the data model itself**. `siteConfig` is a single
  bilingual record — it does not ship separate EN and AR modules.
- **No runtime feature flag service**. `featureFlags` is a compile-time
  constant; it does not call LaunchDarkly, Statsig, GrowthBook, or
  Vercel Edge Config.
- **No schema validation library**. zod is not imported here — the
  inputs are owned by the developer, not by a user or external API.
- **No automated diff against the Google Play Data Safety page**.
  Manual review is the gate; an automated scraper would be
  out-of-proportion effort for a page that changes at most a few
  times per year.
