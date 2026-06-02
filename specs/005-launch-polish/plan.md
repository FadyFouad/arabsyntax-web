# Implementation Plan: Launch Polish — Real Brand, Real App

**Branch**: `005-launch-polish` | **Date**: 2026-04-11
**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Summary

A content-and-refactor pass that replaces every user-visible placeholder
("ArabSyntax" / "النحو العربي") with the real brand forms ("Al-Nahw Al-Kafi"
/ "النحو الكافي"), rewrites the hero copy, adds a one-line trust signal
below the download buttons, hides the pricing section behind a feature
flag (showing a small free-to-download callout in its place), rewrites the
Privacy Policy and Terms of Service to match the live Google Play Data
Safety declaration for a free app, updates the FAQ and footer, and adds
the SEO surfaces the constitution requires but that do not yet exist
(`app/sitemap.ts`, `app/robots.ts`, `SoftwareApplication` JSON-LD, and
`openGraph` metadata on every page) — all consolidated behind a single
`lib/siteConfig.ts` source of truth for brand, developer, store URLs,
rating, and canonical site URL.

Approximately 30 touched files, 2 new components, 4 new `lib` / `app`
files, 4 rewritten MDX files. No new npm dependencies.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.3, React 19, next-intl 4.9.0
**Primary Dependencies**: existing only (next, next-intl, next/font, next/image,
framer-motion, lucide-react, tailwindcss v4, @next/mdx, @mdx-js/react). No new
dependencies are added by this feature.
**Storage**: None (static site; `/support` continues to use the Feature 004
Resend + Upstash Redis path, but this feature does not change its wiring
beyond the sender name and support email).
**Testing**: Manual per `quickstart.md`; Lighthouse ≥ 95 on Performance,
Accessibility, Best Practices, and SEO for every primary route; codebase
grep as an automated brand-rename gate.
**Target Platform**: Netlify (no change from prior features).
**Project Type**: Static bilingual marketing website. App Router, RSC by default.
**Performance Goals**: Lighthouse Performance ≥ 95, Accessibility ≥ 95,
Best Practices ≥ 95, SEO ≥ 95. LCP < 2.5 s, CLS < 0.1, INP < 200 ms
(Constitution §IV).
**Constraints**: RTL logical properties only (Constitution §I); no
hardcoded strings in JSX except brand forms (Constitution §I); single
dark theme, no token changes (Constitution §II); `sitemap.ts` and
`robots.ts` at `app/` root (Constitution §V); `SoftwareApplication`
JSON-LD on landing page (Constitution §V).
**Scale/Scope**: Four routes × two locales (8 rendered pages), one
landing page with eight sections, two MDX legal pages × two locales,
approximately 30 modified files plus 6 new files (2 components,
`lib/siteConfig.ts`, `lib/featureFlags.ts`, `app/sitemap.ts`,
`app/robots.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Rule | Status |
|------|------|--------|
| RTL discipline | No `pl-*`, `pr-*`, `ml-*`, `mr-*`, `left-*`, `right-*`, `text-left`, `text-right`. New `FreeCallout` and `StructuredData` components use only logical utilities. Hero social-proof line centers with `text-center`, `gap-*`, and neutral flex. | ✅ Constitution §I |
| No hardcoded user-visible strings in JSX | All new copy (hero eyebrow, subtitle, social proof, audiences, callout, footer copyright, FAQ, legal MDX) sourced from `messages/{locale}.json` or per-locale MDX. Brand forms "Al-Nahw Al-Kafi" / "النحو الكافي" remain the only allowed hardcoded literals, and they live exclusively in `lib/siteConfig.ts` so they have one owner. | ✅ Constitution §I + deviation below |
| i18n routing | No routing changes. `/`, `/en`, `/privacy`, `/en/privacy`, `/terms`, `/en/terms`, `/support`, `/en/support`. | ✅ Constitution §I |
| Design system discipline | No new color tokens. `FreeCallout` reuses `SectionHeading` + `PlayStoreBadge`; no arbitrary spacing; no hex. | ✅ Constitution §II |
| Accessibility 95+ | Hero `h1` stays one-per-page; social proof rendered as a semantic `<p>` not a decorative element. `StructuredData` emits `<script type="application/ld+json">` only — no visual impact. No new interactive elements. Star glyph in social proof uses `aria-hidden="true"` on the glyph and keeps the numeric rating readable to SRs. | ✅ Constitution §III |
| Performance 95+ | No new client components. `FreeCallout` and `StructuredData` are Server Components. No new images beyond the existing OG image (which is replaced in-place or deferred). Hero remains `priority={true}`. | ✅ Constitution §IV |
| SEO completeness | This feature *closes* the remaining §V gaps: adds `app/sitemap.ts`, `app/robots.ts`, `SoftwareApplication` JSON-LD on landing, `openGraph` metadata on every page, and `hreflang` alternates. Every `generateMetadata` is locale-specific. | ✅ Constitution §V |
| Scope discipline | No user accounts, blog, CMS, analytics, cookies, captcha, or newsletter introduced. | ✅ Constitution §VI |
| Tech stack | No new dependencies. Everything is existing framework code. | ✅ Constitution — Tech Stack table |
| framer-motion gating | Not used by any new component in this feature. Existing `AnimatedSection` usage is untouched. | ✅ Constitution §III |
| `<img>` forbidden | No new `<img>` tags. OG image referenced via `metadata.openGraph.images`. | ✅ Constitution §IV |

### Deviation — Constitution Terminology section

The constitution §Terminology table (lines 236–242) currently lists:

> \| App name \| النحو العربي \| ArabSyntax \|
> \| Premium features \| الميزات المدفوعة \| Premium features \|
> \| Legacy purchasers \| المستخدمون الذين اشتروا التطبيق سابقاً \| Legacy purchasers \|

Every entry in that table is about to become obsolete by the end of this
feature:

- The App name row is factually incorrect — `"النحو العربي"` is a
  placeholder, not the real name.
- The "Premium features" and "Legacy purchasers" rows describe a
  commercial model that this feature is removing from every
  user-visible surface (per FR-026 and FR-037).

**Resolution**: This feature does **not** amend the constitution. A
follow-up `/speckit.constitution` pass (patch-level, non-breaking) is
expected to replace those rows with:

> \| App name \| النحو الكافي \| Al-Nahw Al-Kafi \|
> \| (row removed) \| … \| Premium features — not applicable (free app) \|
> \| (row removed) \| … \| Legacy purchasers — not applicable (free app) \|

The constitution amendment is tracked as a direct follow-up in
`LAUNCH_TODO.md` (see `quickstart.md`). Running this feature without the
amendment does not produce any runtime conflict — the terminology table
is advisory guidance for writers, not enforced by code or tests. The
deviation is captured here for auditability and explicitly blocks the
§Governance compliance bullet "Violations found during review MUST be
documented and resolved before the feature is marked done."

**Post-Phase-1 re-check**: All gates pass. Deviation above remains the
only open constitution item; it is a documented, bounded, follow-up
amendment and does not block implementation.

## Project Structure

### Documentation (this feature)

```text
specs/005-launch-polish/
├── plan.md              ← this file
├── spec.md
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
└── checklists/
    └── requirements.md
```

### Source Code Changes (from `arabsyntax-web/` root)

```text
# ── New files ────────────────────────────────────────────────────────
lib/siteConfig.ts                             ← single source of truth
                                                 (brand, developer, stores,
                                                  rating, url)
lib/featureFlags.ts                           ← { showPricing: false }
app/sitemap.ts                                ← bilingual sitemap
app/robots.ts                                 ← robots config → sitemap
components/sections/FreeCallout.tsx           ← replaces Pricing section
components/seo/StructuredData.tsx             ← SoftwareApplication JSON-LD
LAUNCH_TODO.md                                ← deferred items (OG image,
                                                 constitution amendment)

# ── Rewritten content (no structural change) ────────────────────────
messages/en.json                              ← hero, audiences, free
                                                 callout, faq, footer,
                                                 pricing label removed
messages/ar.json                              ← same with Arabic copy +
                                                 Arabic-Indic digits in
                                                 the social proof line
content/legal/privacy.en.mdx                  ← new structure matching
                                                 live Data Safety
content/legal/privacy.ar.mdx                  ← same
content/legal/terms.en.mdx                    ← subscription language
                                                 removed
content/legal/terms.ar.mdx                    ← same

# ── Edited components (surgical content-only changes) ───────────────
components/sections/Hero.tsx                  ← eyebrow, social proof
components/sections/Audiences.tsx             ← (copy only; layout is
                                                 already balanced)
components/sections/FAQ.tsx                   ← (copy only, via messages)
components/layout/Header.tsx                  ← conditional pricing link,
                                                 brand from siteConfig
components/layout/Footer.tsx                  ← brand + copyright from
                                                 siteConfig
components/ui/AppStoreBadge.tsx               ← reads URL from siteConfig
components/ui/PlayStoreBadge.tsx              ← reads URL from siteConfig
components/layout/MobileMenu.tsx              ← receives filtered nav
                                                 links (no code change;
                                                 Header filters the list)
app/[locale]/layout.tsx                       ← metadata: siteName from
                                                 siteConfig
app/[locale]/page.tsx                         ← metadata + render
                                                 StructuredData;
                                                 render FreeCallout
                                                 when flag off
app/[locale]/privacy/page.tsx                 ← metadata (brand form)
app/[locale]/terms/page.tsx                   ← metadata (brand form)
app/[locale]/support/page.tsx                 ← email from siteConfig
lib/email/resend.ts                           ← from-name + sender
                                                 email from siteConfig

# ── Preserved, gated by flag (NO changes) ────────────────────────────
components/sections/Pricing.tsx               ← unchanged; gated via
                                                 featureFlags.showPricing
messages/{ar,en}.json landing.pricing keys    ← unchanged (flag restores)

# ── Assets ──────────────────────────────────────────────────────────
public/og/og-image.png                        ← REPLACED (regenerated
                                                 with new brand) OR
                                                 deferred via
                                                 LAUNCH_TODO.md
```

**Structure Decision**: Single-project Next.js App Router layout, no new
top-level directories. Every new file lands in an existing conventional
location (`lib/`, `app/`, `components/sections/`, `components/seo/`).
The one new nested directory — `components/seo/` — is allowed by
Constitution §File Structure ("sections/" and "ui/" are examples, not an
exclusive whitelist) and is introduced because `StructuredData.tsx` is
neither a section nor a UI primitive.

## Complexity Tracking

The only complexity deviation is the Constitution §Terminology table
conflict captured under **Constitution Check → Deviation** above. It is
documented rather than justified under Complexity Tracking because it
does not add code complexity — it is a governance paperwork item that
requires a separate `/speckit.constitution` amendment.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution §Terminology table now references a placeholder brand name | The constitution was authored before the real brand was known. Updating it is a separate governance task. | Amending the constitution inside `/speckit.plan` would conflate planning with governance. The constitution has an explicit amendment procedure (§Governance) that a planning pass must not bypass. |
