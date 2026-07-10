# Implementation Plan: Web Account Sync (Google/Apple Sign-In, Progress Sync, Premium Badge)

**Branch**: `006-web-account-sync` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-web-account-sync/spec.md`

## Summary

Add client-side Firebase Authentication (Google + Apple) to the web, sharing one identity with the mobile app. On sign-in, the web upserts the shared `users/{uid}` profile (merge-only, server timestamps, null-omitting per C-1), pulls cloud lesson progress and unions it with the browser-local completion set, and pushes local completions up (per-lesson-key merge writes per C-3, monotonic per FR-15). The existing Mark Complete button becomes the cloud completion signal for signed-in users. A premium label renders in the account menu using a resolver ported from the Cloud Function's `hasPremiumEntitlement()` (C-2). Everything is a client-side island layered on top of the existing pure-SSG site: signed-out visitors get byte-identical static pages, zero Firebase SDK loading, zero backend traffic (FR-4/FR-9). Production enablement is gated behind an env-driven feature flag until launch gates G-1..G-4 are met.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.6 (App Router), React 19
**Primary Dependencies**: Existing: next-intl 4.13, Tailwind v4, lucide-react. New: `firebase` (modular JS SDK — `firebase/auth`, `firebase/firestore`, `firebase/analytics`), loaded lazily on the client only
**Storage**: Firestore (existing app project — `users/{uid}`, `users/{uid}/progress/*`, `purchases/{uid}`; read/write contracts fixed by the mobile app, see [contracts/](./contracts/)); browser localStorage (`arabsyntax-lesson-progress`) remains the signed-out store
**Testing**: Vitest (unit: entitlement resolver, write-payload builders, merge logic), Playwright + Firebase Emulator Suite (auth + firestore integration), manual gate G-4 (real cross-provider account)
**Target Platform**: Static pages on Cloudflare Workers via @opennextjs/cloudflare with `staticAssetsIncrementalCache` — the site is 100% prerendered and MUST stay that way (Worker CPU limits); all auth/sync logic is browser-side
**Project Type**: Web application (existing Next.js site; this feature adds client-side islands only — no new routes, no server rendering changes)
**Performance Goals**: No regression to Lighthouse ≥95 / LCP <2.5s on any page; Firebase SDK excluded from the critical path (dynamic import, never loaded for signed-out visitors who don't interact with auth entry points)
**Constraints**: C-1..C-6 from the spec (cross-platform Firestore contracts, no schema/rules changes, RTL + ar/en localization); zero Firestore traffic and zero auth sessions while signed out (FR-4); monotonic progress writes (FR-15); launch gates G-1..G-4 block production enablement only
**Scale/Scope**: Single Firebase project shared with the mobile app; ~100 static lesson pages unaffected; 6 new lib modules, 4 new client components, 2 modified components, 2 message files extended

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. i18n & RTL-First | PASS | All new UI strings in `messages/{ar,en}.json` under `auth.*`; logical properties only; account menu verified in both locales (spec FR-18/C-6). Auth error messages localized, including the FR-6 cross-provider guidance. |
| II. Design System | PASS | Account menu/badge/dialog use existing tokens (`bg-surface`, `text-primary`, `rounded-xl` buttons, `rounded-2xl` cards); no hardcoded hex; lucide icons. |
| III. Accessibility | PASS | Account menu is a keyboard-reachable disclosure with focus states; icon-only avatar button gets `aria-label`; nudge/dialog focus-trapped; no animation additions (framer-motion not introduced). |
| IV. Performance | PASS | RSC stays default; new client components are small isolated islands with justification comments. Firebase SDK is dynamically imported — never in the shared/initial bundle, never loaded for signed-out non-interacting visitors. No client-side fetching of static content (cloud progress is per-user data, permitted). |
| V. SEO | PASS | No new pages, no route changes, no metadata changes. Signed-out HTML is byte-identical to today (FR-9/SC-7). |
| VI. Scope Discipline | **DEVIATION — APPROVED** | The constitution excludes "User accounts or authentication on the website" from v1 and requires explicit written approval. That approval exists: the product directive of 2026-07-10 with locked decisions D-2 (Google+Apple), D-3 (web writes progress), D-4 (premium badge), captured in spec.md. See Complexity Tracking. |
| VI. Cookie-free analytics | **DEVIATION — MITIGATED** | FR-14 requires Firebase Analytics events (`login`, `sign_up`, `setUserId`). GA sets cookies/storage. Mitigation: analytics is initialized only after a user starts a sign-in attempt — signed-out browsing stays 100% cookie-free, preserving the constitution's intent (no consent banner needed for anonymous visitors). See Complexity Tracking. |
| Tech Stack table | PASS (stale doc noted) | No stack changes. Note: the constitution's "Deployment: Netlify" row is stale — production has been Cloudflare Workers (OpenNext) since before this feature; not a change introduced here. |

**Post-Phase-1 re-check**: PASS — the design (research.md, data-model.md, contracts/) introduces no new violations; both deviations above are unchanged in scope and remain justified.

**Recommendation (not a blocker)**: amend the constitution (MINOR bump) to reflect the already-evolved scope — lesson content, quiz, and (now) accounts — and the Cloudflare deployment. Until then, this plan's Complexity Tracking is the formal record.

## Project Structure

### Documentation (this feature)

```text
specs/006-web-account-sync/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── firestore-user-doc.md
│   ├── firestore-progress.md
│   ├── premium-resolution.md
│   └── analytics-events.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
lib/
├── featureFlags.ts               # MODIFIED — add env-driven `webAccounts` flag (launch gate switch)
└── firebase/                     # NEW — all Firebase access lives here, client-only
    ├── config.ts                 # env-driven config (NEXT_PUBLIC_FIREBASE_*), flag guard
    ├── client.ts                 # lazy singleton app init via dynamic import
    ├── auth.ts                   # popup→redirect sign-in, sign-out, error mapping (FR-1..FR-3, FR-6)
    ├── userProfile.ts            # users/{uid} upsert per C-1 (payload builder is pure/unit-tested)
    ├── progressSync.ts           # cloud read, per-key monotonic merge writes, sign-in union (C-3, FR-15/16)
    ├── entitlement.ts            # premium resolver ported from hasPremiumEntitlement() (C-2)
    └── analytics.ts              # login/sign_up events + setUserId, init-after-consent (FR-14)

components/
├── auth/                         # NEW
│   ├── AuthProvider.tsx          # client context: user, premium, sync state; onAuthStateChanged
│   ├── AccountMenu.tsx           # header island: sign-in button OR avatar menu (name, Premium label, sign-out)
│   ├── SignInButtons.tsx         # Google/Apple provider buttons + localized error surface (incl. FR-6)
│   └── SaveProgressNudge.tsx     # "sign in to save your progress" prompt (FR-17)
├── layout/
│   └── Header.tsx                # MODIFIED — render <AccountMenu /> island (flag-gated)
└── lessons/
    ├── MarkComplete.tsx          # MODIFIED — cloud write when signed in; hide un-toggle; trigger nudge
    └── useLessonProgress.ts      # MODIFIED — expose union view (local ∪ cloud) + completion event hook

messages/
├── ar.json                       # MODIFIED — auth.* strings
└── en.json                       # MODIFIED — auth.* strings

tests/  (following existing vitest/playwright layout)
├── unit: entitlement resolver truth table, userProfile payload builder (null-omission,
│         createdAt read-before-write), progress merge (union, per-key, monotonic)
└── e2e:  emulator-backed sign-in → profile doc shape, progress round-trip, badge on/off
```

**Structure Decision**: extend the existing single-project Next.js layout. All Firebase access is quarantined in `lib/firebase/` (client-only modules, dynamically imported); UI is four small client islands under `components/auth/`. No `app/` route changes, no server actions, no API routes — this preserves the pure-SSG deployment (OpenNext static-assets cache) and satisfies FR-4/FR-9 structurally.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Constitution VI: accounts/auth on the website | One account across app and web is the feature's entire purpose (directive 2026-07-10, locked decisions D-2/D-3/D-4 — explicit written approval per the constitution's own escape clause). Web is now an acquisition/conversion surface, not only a marketing page. | "No accounts" (status quo) rejected by product decision; app-only accounts leave web progress stranded in localStorage and provide no premium continuity. |
| Constitution VI: cookie-free analytics vs FR-14 | Cross-platform funnel comparison requires the app's event vocabulary (`login`, `sign_up`, `setUserId`) in the same Firebase/GA4 property family. | Cookie-free alternatives (Workers Analytics Engine, which the site already uses for `/go` clicks) cannot join events to Firebase `uid`s or GA4 user properties, defeating FR-14's purpose. Mitigation keeps signed-out visitors cookie-free: the analytics module initializes only when a sign-in attempt starts, never on page load. |
