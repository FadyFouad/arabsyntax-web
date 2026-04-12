# Phase 0 Research: Launch Polish

**Feature**: 005-launch-polish
**Date**: 2026-04-11

All Technical Context fields in `plan.md` were either resolved by the
`/speckit.plan` hint or derivable from the existing codebase. This
document captures the decisions that required active investigation —
principally around (a) how the spec's functional requirements map onto
the current file tree, (b) which SEO surfaces already exist versus which
must be created, and (c) how to preserve existing behavior while adding
the new content.

All code paths referenced below were confirmed by direct file read
against the current tree on branch `005-launch-polish`.

---

## Decision 1 — Single source of truth: `lib/siteConfig.ts`

**Decision**: Introduce a new module `lib/siteConfig.ts` that exports a
single frozen `siteConfig` object owning brand forms, developer
identity, store URLs, aggregate rating, canonical site URL, and the
support email. Every other file that needs these values imports from
this module.

**Rationale**:
- **FR-033** requires that the aggregate rating appears in one place.
  A shared module is the smallest possible structure that satisfies it.
- **FR-001 + FR-002** require the brand form to be consistent. Having
  the brand literal live in exactly one file (`siteConfig.ts`) means
  any future rename is one edit, and the grep-based acceptance test
  (SC-001) cannot regress.
- Three hardcoded values in the current codebase — the App Store URL
  (`components/ui/AppStoreBadge.tsx:4`), the placeholder Play Store URL
  (`components/ui/PlayStoreBadge.tsx:4` and `components/sections/Pricing.tsx:7`,
  duplicated), and the `SUPPORT_EMAIL` fallback
  (`app/[locale]/support/page.tsx:52–53`) — each currently live in
  their own file. Consolidating them removes the duplication.
- The Resend wrapper (`lib/email/resend.ts:19–28`) currently throws if
  `SUPPORT_EMAIL` env var is missing AND hardcodes `"ArabSyntax Support
  <support@arabsyntax.com>"` as the from-address and `[ArabSyntax
  Support]` as the subject prefix. Both must be rebranded. The fallback
  comes from `siteConfig.developer.email`.

**Alternatives considered**:
- **Use message files for brand strings** (pass brand through
  `t('common.appName')` everywhere). Rejected because message files
  must not contain store URLs, ratings, or email addresses — those are
  not UI copy. Splitting "brand string lives in messages, URL lives
  elsewhere" creates the duplication this module is supposed to
  eliminate.
- **Use environment variables** for store URLs and email. Rejected as
  the primary source because env vars cannot be grepped and cannot be
  committed as the default; they would also defeat the single-source
  goal. `siteConfig.url` *does* fall through to `NEXT_PUBLIC_SITE_URL`
  as a last resort for sitemap/OG URLs because the deployed site URL
  is environment-dependent; everything else is a hardcoded literal in
  the module.
- **Use a JSON file** (`config/site.json`). Rejected because it loses
  type safety; the TypeScript `as const` form catches typos at build
  time.

**Shape (informative — the authoritative version is in
`data-model.md`)**:

```ts
// lib/siteConfig.ts
export const siteConfig = {
  name: {
    en: 'Al-Nahw Al-Kafi',
    ar: 'النحو الكافي',
  },
  developer: {
    name: 'ETA TECH',
    contact: 'Fady Fouad',
    email: 'fady.fouad.a@gmail.com',
  },
  stores: {
    googlePlay:
      'https://play.google.com/store/apps/details?id=com.etateck.arabsyntax',
    appStore:
      'https://apps.apple.com/us/app/%D8%A7%D9%84%D9%86%D8%AD%D9%88-%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/id6448959921?itscg=30200&itsct=apps_box_badge&mttnsubad=6448959921',
  },
  rating: {
    value: 4.7,
    count: 2600,          // rendered as "2,600+" / "أكثر من ٢٬٦٠٠"
    source: 'Google Play' as const,
  },
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arabsyntax.com',
                          // NEXT_PUBLIC_SITE_URL set per environment on
                          // Netlify; default preserves the existing
                          // canonical base used by pages 003 and 004.
} as const;
```

---

## Decision 2 — Legacy infrastructure identifier `com.etateck.arabsyntax`

**Decision**: Leave the substring `arabsyntax` inside the Google Play
package ID `com.etateck.arabsyntax` exactly as-is. The `siteConfig`
module stores the full URL containing this substring verbatim. Search
acceptance tests MUST exclude this substring when they scan for
brand-name regressions.

**Rationale**:
- **FR-004** explicitly permits legacy infrastructure identifiers
  inside store URLs that visitors never read.
- The real Play Store listing is published under this package ID.
  Changing it is not an option for a site polish; it would require a
  new app release with a new package ID, which is out of scope and
  would in practice be impossible without orphaning existing installs.
- Note the spelling: `etateck`, not `etatech`. The developer's trading
  name is "ETA TECH" (two words, no k), but the Android package ID uses
  `etateck` as the developer's reverse-DNS prefix. This is a
  pre-existing fact about the real listing, not a typo introduced here.

**Alternatives considered**:
- **Rename the Android package**. Impossible without a new app release
  and not in scope.
- **Strip the `arabsyntax` substring and use an `id=` query that
  redirects**. No such redirect exists on the Play Store.

**Acceptance test impact**: The brand-rename grep in `quickstart.md`
excludes `com.etateck.arabsyntax` as an allowed match.

---

## Decision 3 — SEO surfaces that do not exist yet

**Finding**: The constitution §V requires `app/sitemap.ts`,
`app/robots.ts`, and `SoftwareApplication` JSON-LD on the landing page.
Direct inspection of the current tree confirms none of these exist:

- `ls app/sitemap* app/robots* 2>&1` returns "no matches found".
- Grep for `application/ld+json`, `jsonLd`, or `SoftwareApplication`
  across `app/` and `components/` returns zero matches outside the spec
  folder.
- Grep for `openGraph` across `app/` returns zero matches — **none** of
  the existing `generateMetadata` exports set an OpenGraph block.

**Decision**: This feature creates `app/sitemap.ts`, `app/robots.ts`,
and `components/seo/StructuredData.tsx`, and adds an `openGraph` block
to every `generateMetadata` export. This expands scope slightly beyond
"rebrand" into "close the constitution §V gap", but the user's feature
description explicitly names sitemap, structured data, and Open Graph
tags among the things to update — so the work is in scope, just more
than pure editing.

**Rationale**: Publishing the site with the wrong brand violates the
spec; publishing it without the SEO surfaces the constitution requires
violates §V. Both must be correct before launch, so they must happen
together.

**Alternatives considered**:
- **Defer sitemap/robots/JSON-LD to a separate feature**. Rejected —
  the constitution already requires them for any feature that has
  landed, and `001-site-foundation` was supposed to have shipped them.
  Their absence is a pre-existing constitution gap that this feature
  happens to close. Deferring it would mean shipping a rebranded site
  that still fails §V.
- **Ship the JSON-LD inline in `app/[locale]/page.tsx`** without a
  component. Rejected because the rendered JSON must interpolate
  `siteConfig` values and locale-appropriate brand forms. A small
  component that accepts `locale` as a prop is the cleanest shape and
  keeps the page file short.

---

## Decision 4 — Duplicate Play Store URL in `Pricing.tsx`

**Finding**: `components/sections/Pricing.tsx:7` declares its own
`PLAY_STORE_URL` constant pointing at the placeholder value
`https://play.google.com/store/apps/details?id=com.arabsyntax.app`,
separate from the constant in `components/ui/PlayStoreBadge.tsx:4`.

**Decision**: Replace the local constant in `Pricing.tsx` with an
import from `lib/siteConfig.ts`. Even though the Pricing section will
be hidden by `featureFlags.showPricing` in this feature, its code stays
in the repo per FR-016. Leaving the placeholder URL inside it would
leave behind a grep hit for `com.arabsyntax.app` that does not appear
anywhere else — and the next engineer who flips the flag on would
expose a dead link.

**Rationale**: FR-016 requires the Pricing component to "restore the
previous rendering without any other code change" when the flag flips.
"Previous rendering" is not "link to a non-existent package". The
placeholder URL was a TODO that was meant to be resolved anyway. This
feature is the correct place to resolve it.

---

## Decision 5 — Hero social-proof composition

**Finding**: The Hero's current structure (`components/sections/Hero.tsx`)
is:

```text
<section>
  <div> (flex row/column container)
    <div.text-block> (order-2 lg:order-1)
      <p>{tagline}</p>        ← to become "eyebrow"
      <h1>{headline}</h1>     ← to become brand title
      <p>{valueProposition}</p> ← to become subtitle
      <div.flex> badges       ← AppStore + PlayStore
    </div>
    <div.image-block>         (order-1 lg:order-2)
      <Image src="/screenshots/lesson.png" />
    </div>
  </div>
</section>
```

**Decision**: Add a single `<p>` with the social proof line as a new
element *after* the badges container, inside the same text-block
`<div>`. Style as small muted text. The star glyph is a literal "★"
character wrapped in a `<span aria-hidden="true">` so it does not get
read by screen readers (the numeric rating immediately after it is the
semantic content).

**Rationale**:
- **FR-007**: the line must appear immediately below the download
  buttons. The text-block `<div>` is exactly where "immediately below"
  is — moving the line outside that div would break the RTL `order-*`
  flipping.
- **FR-008**: the line must not be styled as a testimonials block. A
  single `<p>` element is the minimum viable form.
- **Accessibility §III**: a star glyph rendered as text with
  `aria-hidden` on the glyph is both WCAG-AA compliant and does not
  require adding a new image asset.

**Copy is fully translated** (from the plan hint):

- EN: `★ 4.7 · 2,600+ reviews on Google Play`
- AR: `★ ٤٫٧ · أكثر من ٢٬٦٠٠ تقييم على Google Play`

The interpunct (·) is a neutral separator that reads correctly in both
directions under RTL flow (it has no direction in Unicode).

---

## Decision 6 — Audience section layout is already compliant

**Finding**: `components/sections/Audiences.tsx` already uses
`<Card className="flex-1">` for both cards and `<div className="flex
flex-col md:flex-row gap-6">` as the container. Both cards share the
same card component, the same width, and the same vertical layout.
**FR-011 and FR-012 are already satisfied structurally.** The only
changes required by this feature are to the copy (the `landing.audiences.*`
keys in the message files) and to the card order if the spec considers
"general learners first" more important.

**Decision**: Do not change the component file. Update only the message
keys. The card order stays as it is (students first in the current
file). This matches the Arabic-first audience of the site.

---

## Decision 7 — Feature-flag gating approach

**Decision**: Define `lib/featureFlags.ts` as a plain TypeScript `as
const` export, not an environment-variable reader and not a runtime
remote-config fetch. The file owns one boolean: `showPricing: false`.

**Rationale**:
- **Scope discipline** (Constitution §VI): no A/B testing, no remote
  config.
- **Server Component compatibility**: because `featureFlags` is a plain
  module-level constant, it can be imported from any Server Component,
  including the Header and the landing page, with no runtime
  machinery.
- **Reversibility**: flipping the boolean to `true` and rebuilding is
  the only thing required to re-enable pricing. This satisfies
  SC-008.

**Shape**:

```ts
// lib/featureFlags.ts
export const featureFlags = {
  showPricing: false,
} as const;
```

The landing page imports `featureFlags` and renders either `<Pricing />`
or `<FreeCallout />` based on `featureFlags.showPricing`. The Header
imports `featureFlags` and filters the `navLinks` array before passing
it to the desktop nav and the mobile menu. The Footer imports
`featureFlags` and filters its Product column the same way.

**Alternatives considered**:
- **Env var (`NEXT_PUBLIC_SHOW_PRICING`)**. Rejected — requires Netlify
  config to be touched to flip, adds deployment-time complexity, and
  cannot be tested with a simple local rebuild.
- **Delete the pricing section and restore later from git**. Rejected
  by FR-016.

---

## Decision 8 — Privacy Policy rewrite structure

**Finding**: `content/legal/privacy.en.mdx` currently claims Firebase
Anonymous Authentication, Firestore, AdMob, entitlement records, GDPR
UMP, TLS encryption, and a 30-day response SLA — **all of which are
either wrong or describe a product that does not exist**. The live
Google Play Data Safety declaration for this app, per the spec's
assumption, states the opposite: no developer collection, three
categories of data shared with third parties, not encrypted in transit,
cannot be deleted on request.

**Decision**: Replace the MDX bodies entirely. Keep the existing
frontmatter shape (`title`, `lastUpdated`, `description`) because
`app/[locale]/privacy/page.tsx` already consumes `frontmatter.title`
and `frontmatter.lastUpdated`. Keep the `{/* DRAFT — REVIEW BY A
LAWYER BEFORE PRODUCTION */}` comment at the top of each file
(Constitution §Workflow item 5 permits DRAFT legal text).

**New section order (identical in both locales)**:

1. Introduction — who we are (ETA TECH / Fady Fouad), what the app is
   (free Arabic grammar learning), effective date.
2. Information We Collect — the developer does not collect personal
   information directly. Third-party services may collect three named
   categories.
3. Data Sharing — list the three Google Play Data Safety categories:
   App activity, App info and performance, Device or other IDs.
4. Data Encryption — explicit disclosure that shared data is not
   encrypted in transit (matches the live declaration).
5. Data Deletion — explicit disclosure that no automated deletion is
   available. Contact for requests.
6. Children's Privacy — the app is suitable for minors; developer does
   not knowingly collect personal information from children; parents
   may contact the developer.
7. Third-Party Services — Google Play Services, App Store, and any
   analytics/ads SDK with links to their own privacy policies.
8. Changes to This Policy — reserved right to update via `lastUpdated`.
9. Contact — `fady.fouad.a@gmail.com` / ETA TECH.

**Rationale**: Mirrors FR-017 through FR-024 one-to-one. Every required
claim maps to a section. Nothing claimed that the app does not do.

---

## Decision 9 — Terms of Service rewrite structure

**Finding**: `content/legal/terms.en.mdx` currently contains sections
"Subscriptions and Billing", "Legacy Purchasers", and references two
external store refund policies. All three references must be removed
per FR-026.

**Decision**: Replace the MDX body entirely, following the section
order the user specified in the plan hint:

1. Acceptance of Terms
2. Description of Service — free Arabic grammar learning app for
   personal, non-commercial use.
3. License to Use — personal, non-commercial, non-transferable,
   revocable.
4. Intellectual Property — all content owned by ETA TECH.
5. User Conduct — no reverse engineering, no redistribution, no
   commercial use.
6. Disclaimer of Warranties — "as is".
7. Limitation of Liability.
8. Changes to Terms.
9. Governing Law — Egypt (kept from existing terms).
10. Contact — `fady.fouad.a@gmail.com`.

The plan hint ordered these as 1–10 with "User Conduct" at position 5;
the existing MDX had User Conduct after the removed sections. The new
ordering is adopted because it reads more naturally and because the
plan hint is canonical for this feature.

---

## Decision 10 — OG image handling (deferred)

**Finding**: `public/og/og-image.png` exists (1200×630, ~92 KB, 8-bit
RGB PNG). It is not currently referenced by any `generateMetadata`
export because no `openGraph` block exists yet. Its visible contents
are unknown without opening the image, which cannot be done in this
planning pass.

**Decision**: Treat this asset as a **deferred launch blocker** and
document it in `LAUNCH_TODO.md` at repo root. This feature adds an
`openGraph.images` entry to every `generateMetadata` export pointing
at `${siteConfig.url}/og/og-image.png`. If the existing PNG still
displays the old brand, the designer will replace the file at the same
path before public launch; the site metadata does not need to change
when they do.

**Rationale**: **FR-034** forbids the image from visibly displaying the
old wordmark. **FR-035** permits a stand-in so long as the asset
requirements are tracked. The cleanest way to satisfy both is to wire
up the reference now (because the site cannot ship with no OG image at
all) and defer the visual replacement to a tracked follow-up.

`LAUNCH_TODO.md` will contain:

```markdown
# Launch TODO — 005-launch-polish deferred items

## 1. Open Graph image — `public/og/og-image.png`
Replace before the first public share of the site URL.
Path: public/og/og-image.png
Dimensions: 1200 × 630 px, PNG
Brand treatment: "النحو الكافي" (Arabic, primary) +
                 "Al-Nahw Al-Kafi" (Latin romanization, secondary)
                 in the dark-theme palette defined in design-tokens.md.

## 2. Constitution §Terminology amendment
Update specs/.specify/memory/constitution.md §Terminology table
to replace the "ArabSyntax" / "النحو العربي" app-name row with
"Al-Nahw Al-Kafi" / "النحو الكافي", and remove the "Premium
features" and "Legacy purchasers" rows (both obsolete for a free app).
Run /speckit.constitution with a PATCH bump.

## 3. "Offline" FAQ answer
Replaced with a "works on-device after download" answer from
the plan hint. Confirm with the developer that the offline
capability described there is accurate for the current app
release before the next content audit. If it is not, update
the FAQ copy in both locales.
```

---

## Decision 11 — FAQ "offline" answer is a soft ambiguity

**Finding**: The plan hint included `Q: Can I use the app without an
internet connection?` and explicitly marked the answer as:
`[Answer based on the actual capability — TODO: confirm with the
developer before publishing.]`

**Decision**: Render the FAQ item with a conservative answer ("Many
lessons are available after a one-time download; an internet
connection is needed for the first download and for updates") and
record a follow-up in `LAUNCH_TODO.md` so the developer can refine it
before public launch. The spec does not require this specific claim to
be verified — FR-036 only requires the FAQ to be consistent with the
three core facts (free, two platforms, two audiences).

**Rationale**: The feature cannot stall on a claim that only the
developer can verify, but it also cannot ship a `TODO` string in
rendered HTML. A conservative default plus a tracked follow-up
satisfies both.

---

## Decision 12 — Resend sender rebrand

**Finding**: `lib/email/resend.ts:25,28` hardcodes:

```ts
from: 'ArabSyntax Support <support@arabsyntax.com>',
subject: `[ArabSyntax Support] ${submission.subject}`,
```

**Decision**: Replace both lines to read from `siteConfig`:

```ts
from: `${siteConfig.name.en} Support <${siteConfig.developer.email}>`,
subject: `[${siteConfig.name.en} Support] ${submission.subject}`,
```

Note: the Resend from-address uses the English brand form for both
locales because the `From:` header is frequently interpreted by
mail clients without bidi awareness, and a hyphenated Latin form is
safer than an Arabic one. The subject prefix likewise stays in
English. The support page's displayed email link (below the form)
uses the same value.

**Rationale**:
- **FR-022** requires a copy-able contact email in the Privacy Policy.
  `siteConfig.developer.email` is the single source.
- **FR-003** requires the grep for "ArabSyntax" to return zero matches
  in non-historical files. The Resend wrapper is currently a match.
  Rebranding it resolves the hit.

**Environment variable (`SUPPORT_EMAIL`)**: kept. If set, it still
overrides `siteConfig.developer.email`. The fallback value changes from
`support@arabsyntax.com` to `siteConfig.developer.email`. The throw on
missing env var in `lib/email/resend.ts:19-21` is relaxed to a fallback
read from `siteConfig` so local dev does not require the env var set.

---

## Decision 13 — `robots.ts` and `sitemap.ts` minimal shape

**Decision**: Both files are one-function exports following the
Next.js App Router convention.

`app/robots.ts`:

```ts
import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
```

`app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

const ROUTES = ['', '/privacy', '/terms', '/support'] as const;
const LOCALES = ['ar', 'en'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();
  for (const route of ROUTES) {
    for (const locale of LOCALES) {
      const path = locale === 'ar' ? route : `/en${route}`;
      entries.push({
        url: `${siteConfig.url}${path || '/'}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: route === '' ? 1.0 : 0.5,
      });
    }
  }
  return entries;
}
```

**Rationale**:
- Constitution §V: sitemap MUST cover both locales. The nested loop
  above produces eight entries (`/`, `/en`, `/privacy`, `/en/privacy`,
  `/terms`, `/en/terms`, `/support`, `/en/support`). The Arabic root
  is served at `/` (no prefix) per `i18n/routing.ts`, matching the
  `localePrefix: "as-needed"` decision in Constitution §I.
- **FR-031**: the sitemap "MUST list every canonical route for both
  locales". The route constant above is the exact list.

**Alternative considered**: Using `alternates.languages` in each
sitemap entry to link Arabic and English variants. Rejected for now
because Next.js App Router's `MetadataRoute.Sitemap` type supports
this as of Next 14, and it is preferable for SEO, but it requires
separate sitemap entries rather than per-entry alternates. Leaving
this as a possible post-launch refinement; it is not required by the
spec.

---

## Decision 14 — `openGraph` block shape for `generateMetadata`

**Decision**: Every `generateMetadata` export gains an `openGraph`
block of the following shape:

```ts
openGraph: {
  title: <page-specific, includes brand in locale form>,
  description: <page-specific>,
  siteName: siteConfig.name[locale],
  url: <absolute canonical URL for this page>,
  locale: locale === 'ar' ? 'ar_AR' : 'en_US',
  type: 'website',
  images: [
    {
      url: `${siteConfig.url}/og/og-image.png`,
      width: 1200,
      height: 630,
      alt: `${siteConfig.name[locale]} — ${<short locale-specific tagline>}`,
    },
  ],
},
```

The landing page also sets `type: 'website'` and the legal pages set
`type: 'article'`. The `twitter` card block is not added — the
constitution does not require it, and `openGraph` already covers the
primary social preview cases. Adding `twitter` would be a low-value
follow-up, not a launch blocker.

**Rationale**:
- **FR-030**: required fields are covered.
- **Constitution §V**: canonical + hreflang are handled by the
  existing `alternates` block already present in every
  `generateMetadata` on pages 001–004. This feature preserves those
  blocks.

---

## Decision 15 — Grepping for constitution compliance after the rename

The spec's SC-001 says the brand grep "MUST return zero matches" in
user-visible files. The implementation gate must therefore include a
precise, reproducible grep command. The one documented in
`quickstart.md` excludes:

- `specs/00[1-4]-*` (historical)
- `node_modules`
- `.git`
- `com.etateck.arabsyntax` (legacy package ID per FR-004 + Decision 2)
- `content/legal/*.mdx` match lines that reference the old brand in a
  "(formerly …)" clause — **none exist**; we check that none are
  introduced.

The command:

```sh
grep -rn "ArabSyntax\|arab syntax\|النحو العربي" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.mdx" --include="*.md" \
  . \
  | grep -v "^./specs/\|^./node_modules/\|^./.git/" \
  | grep -v "com\.etateck\.arabsyntax"
```

This is the single authoritative command. It is reused verbatim in
`quickstart.md` under the verification section.

---

## Open questions deferred to implementation

None. Every decision above is either resolved by the plan hint, by the
spec, or by direct reading of the current tree. The implementer can
start at `quickstart.md` and follow the 16 steps without needing
further guidance.
