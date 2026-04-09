# Implementation Plan: Site Foundation — Bilingual Shell

**Branch**: `001-site-foundation` | **Date**: 2026-04-10
**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Summary

Build the shared shell that every page on the ArabSyntax marketing website
uses: locale routing (Arabic default at `/`, English at `/en`), a dark design
system via Tailwind v4 CSS tokens, Cairo/Inter fonts, a Server Component header
and footer, and a Client Component language switcher that preserves the current
page path when switching locales.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.3, React 19
**Primary Dependencies**: next-intl (to install), lucide-react (to install),
clsx + tailwind-merge (to install for `lib/cn.ts`)
**Storage**: N/A — no database; message files are static JSON
**Testing**: Manual verification per quickstart.md; Lighthouse Accessibility audit
**Target Platform**: Vercel (static export at build time via generateStaticParams)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Lighthouse Accessibility ≥ 95; LCP < 2.5 s; CLS < 0.1
**Constraints**: RTL-only logical CSS properties; no hardcoded strings; no
physical-direction Tailwind utilities; Tailwind v4 CSS-first config
**Scale/Scope**: 2 locales, ~10 components, ~3 shared layout files

## Constitution Check

*GATE: All gates must pass before implementation begins.*

| Gate | Rule | Status |
|------|------|--------|
| RTL discipline | Only logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`) | ✅ Enforced in all component tasks |
| No physical-direction CSS | `pl-*`, `pr-*`, `ml-*`, `mr-*`, `left-*`, `right-*` forbidden | ✅ Grep check in quickstart.md |
| Tailwind v4 CSS-first | Colors and fonts defined in `@theme` in `globals.css`; no `tailwind.config.ts` | ✅ Research Decision 2 |
| next/font/google only | No external font CDNs, no `@font-face` | ✅ Cairo + Inter via next/font/google |
| Strings externalized | All user-visible strings from `messages/{locale}.json` | ✅ Contract in message-schema.md |
| Server Components default | Only `LanguageSwitcher` and `MobileMenu` are Client Components | ✅ Justified by interactivity need |
| Proxy file convention | `proxy.ts` not `middleware.ts` (Next.js 16) | ✅ Research Decision 1 |
| Async params | `await params` used in `[locale]/layout.tsx` and `[locale]/page.tsx` | ✅ Research Decision 3 |
| No light mode | Dark theme only; no `prefers-color-scheme` toggle | ✅ globals.css has no light variant |
| Accessibility 95+ | `aria-label` on icon-only controls; visible focus; semantic headings | ✅ Addressed per component |
| Real copy | Arabic strings must be real Arabic (not Lorem) | ✅ Contract rule #4 |

**Post-Phase-1 re-check**: Verify after data-model.md, contracts, and design
that no new violations have been introduced. All gates currently pass.

## Project Structure

### Documentation (this feature)

```text
specs/001-site-foundation/
├── plan.md              ← this file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── message-schema.md
└── checklists/
    └── requirements.md
```

### Source Code Changes (from arabsyntax-web/ root)

```text
# New files to create:
proxy.ts                                    ← next-intl locale middleware (Next.js 16)
i18n/
  routing.ts                                ← locales, defaultLocale, localePrefix
  request.ts                                ← server-side message loading
messages/
  ar.json                                   ← Arabic strings (real Arabic copy)
  en.json                                   ← English strings
lib/
  cn.ts                                     ← clsx + tailwind-merge helper
components/
  layout/
    Header.tsx                              ← Server Component
    Footer.tsx                              ← Server Component
    MobileMenu.tsx                          ← Client Component (toggle state)
    LanguageSwitcher.tsx                    ← Client Component (usePathname)
  ui/
    Container.tsx                           ← Server Component (max-w wrapper)
app/
  [locale]/
    layout.tsx                              ← locale shell (lang, dir, fonts, Header, Footer)
    page.tsx                                ← placeholder "Foundation ready"

# Files to modify:
app/globals.css                             ← Replace with dark theme @theme tokens + fonts
app/layout.tsx                              ← Remove root layout content (kept for Next.js,
                                              but all real layout moves to [locale]/layout.tsx)
next.config.ts                              ← Add next-intl plugin

# Files to remove:
app/page.tsx                                ← Replaced by app/[locale]/page.tsx
```

**Note**: `app/layout.tsx` at the root is still required by Next.js App Router
as the outermost shell. It should be minimal (just `<html>`, `<body>`, and the
`globals.css` import), with all locale-specific setup in `app/[locale]/layout.tsx`.
Actually, with the `[locale]` segment pattern, the root `app/layout.tsx` becomes
a passthrough or can be removed if all routes are under `[locale]`. Verify the
Next.js 16 docs for the correct approach.

## Complexity Tracking

No constitution violations requiring justification. All two Client Components
(`LanguageSwitcher`, `MobileMenu`) are justified by unavoidable browser API
requirements (`usePathname`, `useState`).

---

## Phase 0: Research

*Complete. See [research.md](research.md) for all decisions.*

Key resolved decisions:
- `proxy.ts` instead of `middleware.ts` (Next.js 16)
- Tailwind v4 `@theme` in CSS — no `tailwind.config.ts`
- `await params` in Next.js 16 layouts
- Text logo (no SVG) during foundation
- Disclosure mobile menu pattern

---

## Phase 1: Design & Contracts

*Complete. See artifacts below.*

- **Data model**: [data-model.md](data-model.md)
- **Message schema contract**: [contracts/message-schema.md](contracts/message-schema.md)
- **Verification guide**: [quickstart.md](quickstart.md)

**Post-Phase-1 Constitution Check re-evaluation**: All gates still pass. The
data model confirms no database or server-side data is needed. The message
schema enforces string externalization. The component list is minimal and
RTL-discipline compliant.
