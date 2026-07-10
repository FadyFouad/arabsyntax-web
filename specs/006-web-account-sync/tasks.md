# Tasks: Web Account Sync (Google/Apple Sign-In, Progress Sync, Premium Badge)

**Input**: Design documents from `/specs/006-web-account-sync/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED — the plan (research.md R-10) mandates unit tests for the three contract-critical pure modules and emulator-backed e2e for the Firestore interactions. Contract-critical unit tests are written FIRST within each story.

**Organization**: Grouped by user story (US1 sign-in, US2 progress sync, US3 premium badge) so each is independently implementable and testable. All file paths are repo-root-relative (`/Users/fadyfouad/Downloads/Projects/arabsyntax-web/`).

**Constant constraints for every task**: client-side only (no new routes/server actions — FR-9); RTL-safe logical Tailwind properties and `messages/{ar,en}.json` strings only (C-6); no new Firestore collections/fields/rules (C-5); everything unreachable when `featureFlags.webAccounts` is false (R-9).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, configuration, flag, and emulator tooling every story needs

- [ ] T001 Install `firebase` (modular JS SDK) as a dependency in package.json; verify `npm run build` still succeeds with no bundle-size change to existing pages (SDK must only ever be dynamically imported)
- [ ] T002 [P] Add env plumbing: extend `.env.example` with `NEXT_PUBLIC_WEB_ACCOUNTS`, `NEXT_PUBLIC_FIREBASE_API_KEY/AUTH_DOMAIN/PROJECT_ID/APP_ID/MEASUREMENT_ID`, `NEXT_PUBLIC_FIREBASE_EMULATORS` (values + comments per quickstart.md); create `lib/firebase/config.ts` exporting a typed config object read from these vars plus an `isConfigured` guard
- [ ] T003 [P] Extend `lib/featureFlags.ts` with `webAccounts: process.env.NEXT_PUBLIC_WEB_ACCOUNTS === 'true'` (build-time baked; keep `as const` typing working)
- [ ] T004 [P] Add Firebase Emulator Suite config: `firebase.json` (auth + firestore emulators, demo project id `demo-arabsyntax`) and npm script `emulators` in package.json per quickstart.md
- [ ] T005 [P] Add ALL `auth.*` message keys to `messages/ar.json` and `messages/en.json`: sign-in button, provider buttons, account menu (sign out, aria labels), premium label, save-progress nudge, and every error string — including the FR-6 cross-provider guidance parameterized by provider ("This email is already registered — try signing in with {provider}") and generic sign-in/sync failure messages. Arabic is the primary copy; follow existing nested camelCase key conventions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lazy Firebase bootstrap + auth context that all three stories consume

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create `lib/firebase/client.ts`: lazy singleton that dynamically `import()`s `firebase/app` + `firebase/auth` (and `firebase/firestore` on demand), initializes from `lib/firebase/config.ts`, wires emulator connections when `NEXT_PUBLIC_FIREBASE_EMULATORS` is set, and throws if called while `featureFlags.webAccounts` is false. Firebase must never appear in any statically-imported module graph reachable from a page
- [ ] T007 Create `components/auth/AuthProvider.tsx`: client context exposing `{ status, user, isPremium, syncState }` per data-model.md. On mount, check `localStorage['arabsyntax-auth']`; only if present, dynamically load Firebase and attach `onAuthStateChanged` (R-6 zero-traffic invariant). Renders children immediately (no loading gate for signed-out visitors). Include the `'use client'` justification comment (constitution IV)
- [ ] T008 Mount `<AuthProvider>` in `app/[locale]/layout.tsx` wrapping the existing shell, rendered only when `featureFlags.webAccounts` is true (children render identically when the flag is off — signed-out/flag-off HTML must be byte-identical, SC-7)

**Checkpoint**: Flag off → site byte-identical to today. Flag on → context mounts, zero Firebase loading without the marker. User stories can now proceed (in parallel if staffed)

---

## Phase 3: User Story 1 - One Account Across App and Web (Priority: P1) 🎯 MVP

**Goal**: Google/Apple sign-in on web sharing the app's Firebase identity; safe `users/{uid}` upsert; account menu with sign-out; FR-6 cross-provider guidance; `login`/`sign_up` analytics

**Independent Test**: With emulators (quickstart.md §Verify 1–2): sign in with each provider → account menu shows name; emulator shows correct doc shape (server-Timestamp fields, no nulls, `createdAt` written once); sign out works; signed-out browsing makes zero Firebase requests

### Tests for User Story 1 (write first, must fail)

- [ ] T009 [P] [US1] Unit tests for the profile payload builder in `tests/unit/userProfile.test.ts` (or existing vitest layout): truth table from contracts/firestore-user-doc.md — displayName present/absent/null × doc new/existing × createdAt present/absent; asserts null-omission, createdAt-only-when-absent, serverTimestamp sentinels for all three timestamp fields, forbidden keys never present
- [ ] T010 [P] [US1] Emulator e2e in `tests/e2e/auth.spec.ts` (Playwright): (a) sign-in creates `users/{uid}` with Timestamp-typed `createdAt`/`lastSignInAt`, `provider` ∈ {'google','apple'} lowercase; (b) second sign-in preserves `createdAt` and an existing `displayName` when the new credential has none (Apple second-consent simulation); (c) sign-out writes `lastSignOutAt`; (d) signed-out page load performs zero requests to auth/firestore endpoints (network interception)

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create `lib/firebase/userProfile.ts`: pure `buildProfileUpsert()` per contracts/firestore-user-doc.md + `upsertUserProfile(user, provider)` doing `getDoc` → build → `setDoc(..., {merge:true})`, and `markSignOut(uid)` writing `lastSignOutAt`
- [ ] T012 [P] [US1] Create `lib/firebase/analytics.ts` per contracts/analytics-events.md: lazy `isSupported()`-guarded init (only invoked when a sign-in attempt starts), `logLogin(method, result)`, `logSignUp(method)`, `setAnalyticsUserId(uid)`; every call no-ops silently on failure
- [ ] T013 [US1] Create `lib/firebase/auth.ts`: `signInWith(provider)` using `signInWithPopup` with redirect fallback per research.md R-2 (incl. `getRedirectResult` handling on bootstrap), `signOutUser()` (calls `markSignOut` then Firebase signOut, clears `arabsyntax-auth` marker), sets marker on success, calls `upsertUserProfile` + analytics events (`sign_up` when the upsert set `createdAt`), and maps error codes to message keys — `auth/account-exists-with-different-credential` resolves the other provider per R-7 (FR-6)
- [ ] T014 [P] [US1] Create `components/auth/SignInButtons.tsx`: Google + Apple buttons (design-system tokens, `rounded-xl`, logical properties), loading/disabled states, localized error surface rendering the mapped error keys — FR-6 guidance must name the provider to try
- [ ] T015 [US1] Create `components/auth/AccountMenu.tsx`: header island — signed out: sign-in button opening SignInButtons (popover/dialog, focus-trapped, `aria-label`ed); signed in: avatar/name button opening a keyboard-accessible menu with display name and sign-out. Reads name from `auth.currentUser`/context, never from the Firestore `provider` field (C-4). Reserve a slot for the US3 premium label
- [ ] T016 [US1] Modify `components/layout/Header.tsx`: render `<AccountMenu />` (flag-gated via `featureFlags.webAccounts`) in the actions cluster, and add the account entry to `components/layout/MobileMenu.tsx` drawer; verify both locales/directions
- [ ] T017 [US1] Wire redirect-fallback bootstrap: in AuthProvider, process `getRedirectResult` on load when the marker or a pending-redirect flag is present, completing the same post-sign-in pipeline (upsert, analytics, marker) as the popup path

**Checkpoint**: US1 fully functional — sign in/out with both providers against emulators, correct doc writes, T009/T010 green. MVP deliverable

---

## Phase 4: User Story 2 - Lesson Progress Follows the User (Priority: P2)

**Goal**: Cloud progress reflected in the lesson tree on sign-in; Mark Complete writes per-key monotonic completions the app reads; local↔cloud union merge; signed-out nudge

**Independent Test**: With emulators (quickstart.md §Verify 3–5): seed an app-style `lesson_completion` doc (Timestamp + ISO string values) → tree shows them completed; Mark Complete on web adds exactly one per-key entry without touching seeded ones; signed-out completion + sign-in → union merged up; no un-complete affordance while signed in

### Tests for User Story 2 (write first, must fail)

- [ ] T018 [P] [US2] Unit tests for the merge planner in `tests/unit/progressSync.test.ts`: parses `completed` maps with Timestamp AND ISO-string values into a key set; union plan = `localSet − cloudKeys` only; generated write payloads contain only `completed.<lessonId>` dot-path keys + `updatedAt`; NEVER emits deletes/false/whole-map (FR-15/C-3); empty-diff → no write
- [ ] T019 [P] [US2] Emulator e2e in `tests/e2e/progress.spec.ts`: (a) seeded app-style doc renders as completed in the tree; (b) web Mark Complete → doc gains `completed.<slug>` with Timestamp value, seeded entries byte-identical, and NO top-level field literally named `"completed.<slug>"` exists (the JS-SDK dot-path trap, contracts/firestore-progress.md §3); (c) first-ever write (no doc) creates the correct nested shape; (d) signed-out completion then sign-in → union appears in cloud and locally; (e) signed-in lesson page shows no un-complete control

### Implementation for User Story 2

- [ ] T020 [US2] Create `lib/firebase/progressSync.ts` per contracts/firestore-progress.md: `readCloudCompletions(uid)` (tolerant value parsing), `writeCompletion(uid, lessonId)` via `updateDoc` dot-path with `setDoc`-nested-map fallback on not-found, `mergeLocalIntoCloud(uid, localSet)` (single batched updateDoc, same fallback), all touching ONLY the `lesson_completion` doc
- [ ] T021 [US2] Extend `components/lessons/useLessonProgress.ts`: keep the localStorage store as the single reactive source; add `applyCloudCompletions(ids)` that unions cloud ids into the local store (never removes — existing `withCompletion` semantics preserved for signed-out); expose a completion-event callback so MarkComplete can trigger cloud writes without coupling the store to Firebase
- [ ] T022 [US2] Wire sign-in sync into `components/auth/AuthProvider.tsx`: on `signedIn`, run `readCloudCompletions` → `applyCloudCompletions` → `mergeLocalIntoCloud` (FR-7 + FR-16), tracking `syncState` (`merging`/`idle`/`error`) with a localized non-blocking error path; failed completion writes stay local and are retried by the next union merge (idempotent)
- [ ] T023 [P] [US2] Create `components/auth/SaveProgressNudge.tsx`: small dismissible prompt ("sign in to save your progress") with a sign-in action reusing SignInButtons; logical properties, focus management, both locales
- [ ] T024 [US2] Modify `components/lessons/MarkComplete.tsx`: signed in → completed lessons render a static completed state (no un-toggle, FR-15) and completing calls the store + `writeCompletion` (one write per press, C-3); signed out → unchanged toggle behavior + render SaveProgressNudge after marking complete (FR-17); flag off → file behaves exactly as today

**Checkpoint**: US1 + US2 independently functional — full progress round-trip verified against emulators, T018/T019 green

---

## Phase 5: User Story 3 - Premium Status Visible on Web (Priority: P3)

**Goal**: "Premium" label under the name in the account menu for active lifetime/monthly/yearly entitlements, per the C-2 resolver with the locked legacyPremium delta

**Independent Test**: With emulators (quickstart.md §Verify 6): seed `purchases/{uid}` variants → badge shows for `lifetime` and `monthly+cancelled+future-expiry`; absent for `expired` status, past expiry, `legacyPremium`, and missing doc

### Tests for User Story 3 (write first, must fail)

- [ ] T025 [P] [US3] Unit tests for the resolver in `tests/unit/entitlement.test.ts`: the FULL truth table from contracts/premium-resolution.md — every plan × status × expiry row, explicitly including `legacyPremium → false` (D-5 delta, with a comment linking the contract's do-not-fix warning), `cancelled` NOT ended, absent expiry trusted, doc-missing → false
- [ ] T026 [P] [US3] Emulator e2e in `tests/e2e/premium.spec.ts`: seeded purchases docs from quickstart.md → account menu shows/hides the Premium label per the truth table; read failure (no doc) → no badge, no error surfaced

### Implementation for User Story 3

- [ ] T027 [US3] Create `lib/firebase/entitlement.ts`: pure `resolvePremium(data, now)` implementing contracts/premium-resolution.md exactly (ended-status set `expired|refunded|revoked|paused`; legacyPremium delta documented inline), plus `fetchIsPremium(uid)` reading `purchases/{uid}` once, resolving free on any read failure
- [ ] T028 [US3] Wire `isPremium` into `components/auth/AuthProvider.tsx` (resolve once per session after sign-in/restore, cached in context — no realtime listener, D-4) and render the localized Premium label in the reserved slot of `components/auth/AccountMenu.tsx` (design tokens, no gating of anything)

**Checkpoint**: All three user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T029 [P] Zero-traffic + byte-identical verification (SC-7/FR-9): build with flag off and flag on; diff signed-out HTML of `/`, `/lessons`, one lesson page (must be identical); with flag on and no auth marker, assert no firebase chunks load and no auth/firestore/analytics requests or cookies occur (extend `tests/e2e/auth.spec.ts` if not covered by T010d)
- [ ] T030 [P] Performance check (constitution IV): `npm run build` bundle inspection — `firebase` absent from all initial page chunks; Lighthouse ≥95 / LCP unchanged on `/` and a lesson page with the flag on
- [ ] T031 [P] RTL/i18n visual verification (constitution DoD): account menu, sign-in dialog, nudge, premium label, and all error states in `/` (ar, RTL) and `/en` (LTR); directional icons flip; keyboard/focus audit of the menu and dialogs
- [ ] T032 Run full verification: `npm run lint && npm run typecheck && npm run test && npm run test:e2e` plus the quickstart.md walkthrough end-to-end against emulators; fix anything red
- [ ] T033 [P] Docs: record the ops/launch checklist as `specs/006-web-account-sync/launch-gates.md` — G-1 (app BL-1 release), G-2 (Apple Services ID + return URL + Firebase console), G-3 (authorized domains + OAuth consent + Web App registration for measurementId), optional `/__/auth` same-origin proxy for the redirect fallback (research.md R-2), G-4 (manual cross-provider test script) — and the production enablement step (`NEXT_PUBLIC_WEB_ACCOUNTS=true`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately; T002–T005 parallel after T001
- **Foundational (Phase 2)**: needs Phase 1; T006 → T007 → T008 (sequential — each consumes the previous)
- **US1 (Phase 3)**: needs Phase 2. Internal: T009/T010 first (fail), then T011/T012 [P] → T013 → T014 [P with T013 finishing] → T015 → T016/T017
- **US2 (Phase 4)**: needs Phase 2; integrates with US1's AuthProvider sign-in pipeline (T022 touches AuthProvider — coordinate if US1/US2 run in parallel). Internal: T018/T019 first, then T020/T021/T023 [P] → T022 → T024
- **US3 (Phase 5)**: needs Phase 2 + AccountMenu (T015). Internal: T025/T026 first, then T027 → T028
- **Polish (Phase 6)**: needs all desired stories; T029/T030/T031/T033 parallel, T032 last

### Cross-story file-conflict notes

- `components/auth/AuthProvider.tsx` is edited by T007 (create), T017 (US1), T022 (US2), T028 (US3) — serialize these edits
- `components/auth/AccountMenu.tsx` is edited by T015 (US1) and T028 (US3)
- `messages/{ar,en}.json` is written once in T005 to avoid three-way merge conflicts

### Parallel Example: after Phase 2 completes

```bash
# US1 kickoff (tests first, in parallel):
Task: "T009 unit tests for profile payload builder in tests/unit/userProfile.test.ts"
Task: "T010 emulator e2e in tests/e2e/auth.spec.ts"
# then models/services in parallel:
Task: "T011 lib/firebase/userProfile.ts"
Task: "T012 lib/firebase/analytics.ts"
```

---

## Implementation Strategy

**MVP first**: Phases 1–3 (T001–T017) deliver a demoable, independently valuable increment — shared sign-in with safe profile writes. Stop, run T009/T010 + quickstart §1–2, validate, then continue.

**Incremental delivery**: add US2 (the core cross-platform value), validate the progress round-trip; add US3 (badge); finish with Polish. Each checkpoint leaves the site shippable — production stays unaffected regardless, since `NEXT_PUBLIC_WEB_ACCOUNTS` is unset in prod until launch gates G-1..G-4 pass (tracked in T033's checklist).

**Totals**: 33 tasks — Setup 5, Foundational 3, US1 9 (2 test + 7 impl), US2 7 (2 test + 5 impl), US3 4 (2 test + 2 impl), Polish 5.
