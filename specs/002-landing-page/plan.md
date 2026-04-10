# Implementation Plan: Marketing Landing Page

**Branch**: `002-landing-page` | **Date**: 2026-04-10
**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Summary

Build the eight-section marketing landing page inside the existing bilingual
shell (foundation complete). The page converts Arabic and English visitors to
Google Play installs through: a hero with a Play Store badge, a features grid,
a how-it-works explainer, a screenshot gallery, a pricing section (free +
three paid tiers), an audience callout, an FAQ accordion, and a final CTA.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.3, React 19, next-intl 4.9.0
**Primary Dependencies**: framer-motion (to install), next/image (built-in)
**Storage**: N/A — all content is static JSON in message files
**Testing**: Manual per quickstart.md; Lighthouse Performance + Accessibility ≥ 95
**Target Platform**: Vercel (statically generated via `generateStaticParams`)
**Project Type**: Web application — marketing landing page
**Performance Goals**: LCP < 2.5 s (hero mockup priority-loaded); Lighthouse 95+
**Constraints**: RTL logical properties only; all strings from message files;
Server Components by default; framer-motion gated on prefers-reduced-motion
**Scale/Scope**: 8 section components, 5 UI components, 2 locale message
extensions — approximately 18 new or modified files

## Constitution Check

*GATE: Must pass before implementation begins. Re-check after Phase 1 design.*

| Gate | Rule | Status |
|------|------|--------|
| RTL discipline | Only logical Tailwind properties; hero column order via flex-row + dir attribute (no physical overrides) | ✅ Research Decision 4 |
| Server Components default | FAQ uses `<details>/<summary>` (Server); Screenshots is Server; only AnimatedSection is Client | ✅ Research Decisions 1, 2, 3 |
| framer-motion gated | `useReducedMotion()` in AnimatedSection; no animation in Server Components | ✅ Research Decision 3 |
| No hardcoded strings | All copy in `landing.*` message namespace; brand name "ArabSyntax" excepted | ✅ Contract in message-schema.md |
| No `<img>` tags | All images use `next/image` with explicit width+height; hero mockup uses priority={true} | ✅ Plan enforced per component |
| Accessibility 95+ | FAQ uses native `<details>/<summary>` (browser-native ARIA); all images have alt text | ✅ Research Decision 1 |
| No AppStore badge visible | AppStoreBadge.tsx returns null until iOS ships | ✅ Research Decision 7 |
| Pricing: no in-page checkout | CTA buttons link to Play Store URL; no payment form | ✅ Enforced per FR-007 |
| Tailwind v4 | No new `tailwind.config.ts` entries; any new tokens go in `@theme` in globals.css | ✅ No new design tokens needed |
| Font/color tokens | All components use `bg-surface`, `text-text`, `text-primary`, etc. — no hardcoded hex | ✅ All sections use existing tokens |

**Post-Phase-1 re-check**: All gates still pass.

## Project Structure

### Documentation (this feature)

```text
specs/002-landing-page/
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
# Install
framer-motion                               ← scroll-in animations (npm install framer-motion)

# New section components
components/sections/
  Hero.tsx                                  ← Server Component
  Features.tsx                              ← Server Component
  HowItWorks.tsx                            ← Server Component
  Screenshots.tsx                           ← Server Component
  Pricing.tsx                               ← Server Component
  Audiences.tsx                             ← Server Component
  FAQ.tsx                                   ← Server Component (<details>/<summary>)
  FinalCTA.tsx                              ← Server Component

# New UI components
components/ui/
  AnimatedSection.tsx                       ← 'use client' (framer-motion wrapper)
  PlayStoreBadge.tsx                        ← Server Component (locale prop)
  AppStoreBadge.tsx                         ← Server Component (returns null — iOS deferred)
  Card.tsx                                  ← Server Component (shared card shell)
  SectionHeading.tsx                        ← Server Component (h2 + subtitle)

# Modified files
app/[locale]/page.tsx                       ← Replace placeholder with all 8 sections
messages/ar.json                            ← Add landing.* namespace (real Arabic copy)
messages/en.json                            ← Add landing.* namespace (English copy)
app/globals.css                             ← Add scroll-behavior: smooth to html selector

# New assets
public/badges/
  google-play-en.png                        ← Official Google Play badge
  google-play-ar.png                        ← Official Google Play badge (Arabic variant)
public/screenshots/
  lesson.png                                ← Placeholder (dark rect, 390×844)
  quiz.png                                  ← Placeholder (dark rect, 390×844)
  examples.png                              ← Placeholder (dark rect, 390×844)
```

## Complexity Tracking

| Item | Justification |
|------|---------------|
| AnimatedSection `'use client'` | framer-motion's `useReducedMotion` is a client-only hook; this is the minimum client boundary for scroll animations. The component is small and isolated. |

No other constitution violations.

---

## Phase 0: Research

*Complete. See [research.md](research.md).*

Key decisions:
- FAQ: native `<details>/<summary>` — Server Component, no JS state
- Screenshots: Server Component, native scroll-snap, no scroll dots
- framer-motion: install, `AnimatedSection` client wrapper, `useReducedMotion` gate
- Hero two-column: `flex flex-row` — `dir` attribute handles RTL naturally
- PlayStoreBadge: Server Component, locale prop from parent
- AppStoreBadge: scaffolded, returns null (iOS out of scope for v1)
- Pricing: placeholder amounts with TODO comments in message files

---

## Phase 1: Design & Contracts

*Complete. See artifacts below.*

- **Data model**: [data-model.md](data-model.md) — section registry, 6 entity types, icon map
- **Message schema**: [contracts/message-schema.md](contracts/message-schema.md) — full `landing.*` key tree
- **Verification guide**: [quickstart.md](quickstart.md) — 12 checks (Lighthouse, RTL, FAQ keyboard, screen reader)

**Post-Phase-1 Constitution Check re-evaluation**: All gates still pass. No in-page
checkout, no hardcoded strings, no physical-direction CSS, Server Components by
default throughout.

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
