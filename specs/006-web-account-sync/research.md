# Phase 0 Research: Web Account Sync

**Feature**: 006-web-account-sync | **Date**: 2026-07-10

All contracts below were extracted verbatim from the mobile app repo at
`/Users/fadyfouad/AndroidStudioProjects/arabsyntax` (the authoritative source the audit cites),
not inferred. File:line references point into that repo unless marked `web:`.

## R-1: Firebase integration strategy on a pure-SSG Cloudflare site

**Decision**: Client-only Firebase modular JS SDK (`firebase` npm package), initialized lazily via
dynamic `import()` inside `lib/firebase/client.ts`. No server-side auth (no session cookies, no
NextAuth, no server actions touching Firebase). Auth state lives exclusively in the browser.

**Rationale**:
- The site is 100% prerendered and served from Workers static assets (`open-next.config.ts` uses
  `staticAssetsIncrementalCache`; re-rendering in the Worker trips CPU limits). Server-side auth
  would force dynamic rendering — a deployment regression, and a violation of FR-9.
- FR-4 requires zero backend traffic for signed-out visitors: a client SDK that is only imported
  when (a) the user opens a sign-in entry point, or (b) a previously signed-in user returns
  (detected via a lightweight local marker, see R-6) satisfies this structurally.
- The mobile app already uses Firebase Auth + Firestore on the same project; the web SDK reads and
  writes the identical documents with no backend of our own.

**Alternatives considered**:
- NextAuth/Auth.js with Firebase adapter — rejected: introduces server sessions and dynamic routes,
  breaks SSG purity, and creates a second identity system beside the app's Firebase-native one.
- Firebase session cookies verified in the Worker — rejected: no server-rendered personalization is
  needed (badge and progress are client concerns), and it adds Worker CPU per request.

## R-2: Sign-in flow (popup vs redirect)

**Decision**: `signInWithPopup` as the primary flow for both providers. On popup failure
(`auth/popup-blocked`, `auth/popup-closed-by-user` is NOT retried, `auth/cancelled-popup-request`,
or environments where popups cannot open), fall back to `signInWithRedirect`.

**Rationale**: FR-1 mandates "popup with redirect fallback". Popup keeps the static page alive (no
full navigation) and is unaffected by third-party-storage partitioning.

**Known constraint (redirect fallback)**: browsers that partition third-party storage (Safari,
Firefox, Chrome timeline) break `signInWithRedirect` when `authDomain` is the default
`<project>.firebaseapp.com`. Firebase's documented remedies: serve the auth helper from the site's
own origin (proxy `/__/auth/*` to `<project>.firebaseapp.com`) and set
`authDomain: 'alnahwalkafi.com'`. On this stack that is a Cloudflare-side concern (route/origin
rule in front of the Worker, or a small passthrough in the Worker). **This is an ops prerequisite
of the redirect fallback only** — popup works without it. Recorded as an addition to launch-gate
G-2/G-3 ops work; implementation ships popup-first and the fallback is verified as part of gate
testing.

**Alternatives considered**: redirect-primary (simpler code path) — rejected: full page navigation
away from static pages, worse UX, and it is the flow most at risk from storage partitioning.

## R-3: Progress document contract (authoritative)

**Decision**: web reads/writes only `users/{uid}/progress/lesson_completion`.

Extracted contract (`lib/features/auth/data/firestore_progress_sync_repository.dart`):
- The progress subcollection has four fixed doc ids: `lesson_completion`, `quiz_results`,
  `streak_data`, `audio_positions` (lines 20–24). Per FR-10, web touches only the first.
- `lesson_completion` doc shape: field `completed` — a **map keyed by slug lessonId, value is a
  completion time**, NOT a boolean. The app's reader (lines 31–41) accepts both Firestore
  `Timestamp` and ISO-8601 string values. The doc also carries `updatedAt` (server timestamp).
- The app's steady-state single-completion write (`markLessonCompleted`, lines 147–151) is:
  `{'completed.<lessonId>': FieldValue.serverTimestamp(), 'updatedAt': FieldValue.serverTimestamp()}`
  with `SetOptions(merge: true)` — a dot-path field merge that touches only that map entry.
- `mergeLessonCompletions` (lines 254–267) is the same dot-path pattern with ISO-8601 string values.
- The forbidden pattern (C-3): `writeAll` replaces the entire `completed` map — web must never do this.

**Web write shape (matches `markLessonCompleted`)**:
```ts
setDoc(doc(db, 'users', uid, 'progress', 'lesson_completion'),
  { [`completed.${lessonId}`]: serverTimestamp(), updatedAt: serverTimestamp() },
  { merge: true })
```
Note on the JS SDK: dot-path keys inside `setDoc(..., {merge:true})` are treated as literal field
names, not paths — the implementation MUST use `updateDoc` (which does interpret dot paths) after
ensuring the doc exists, or `setDoc` with `new FieldPath(...)` semantics via `updateDoc`. Concrete
approach: try `updateDoc` first; on `not-found`, create the doc with a nested single-entry map via
`setDoc(..., {merge:true})`, which merges maps key-wise and is equally clobber-safe for a fresh
doc. This nuance is a defect trap and is captured in contracts/firestore-progress.md.
- Web reads parse both value types (Timestamp | ISO string) and only needs the key set.
- Lesson id equality verified: web `content/lessons/tree.json` `lessonId` values are the identical
  slugs (`elm_alnaho`, `aqsam_kalam`, …) used as `completed` map keys by the app. No mapping layer.

**Sign-in union merge (FR-16)**: local completions lack original timestamps (localStorage stores a
plain id set), so keys missing from the cloud are written with `serverTimestamp()` values — same
per-key merge, one batched write for the initial merge (single `updateDoc` with N dot-path keys),
then one write per completion event thereafter (C-3).

## R-4: users/{uid} profile write contract (authoritative)

Extracted from `lib/features/auth/data/firestore_user_profile_repository.dart` (lines 22–36, 79–95):
- Fields written on sign-in: `email` (string), `displayName` (string), `provider`
  (`'google'`|`'apple'`, lowercase — enum `AuthProvider.value`), `lastSignInAt`
  (`FieldValue.serverTimestamp()`), plus `createdAt` (`serverTimestamp()`) **only** when the doc
  doesn't exist or the field is absent (read-before-write, lines 32–33).
- The app's reader hard-casts `createdAt`/`lastSignInAt` `as Timestamp?` — writing strings/millis
  permanently breaks the app for that user (audit BL-4). Web MUST use `serverTimestamp()`.
- On sign-out the app writes `lastSignOutAt: serverTimestamp()` — web mirrors this for parity.
- **Null-omission (C-1)**: web builds the payload with a pure builder that drops undefined/null
  fields — critical for Apple's name-only-on-first-consent behavior; `displayName: null` would
  erase an app-written name under `{merge:true}`.
- Security rules (`firestore.rules:5–18`): owner may write own doc EXCEPT
  `reengagementPushCount` / `lastReengagementPushAt` (server-owned; write rejected if touched).
  Web never includes them. Progress docs are fully owner read/write (rules lines 20–22). No rules
  changes needed — C-5 holds.

## R-5: Premium resolution (authoritative, with one documented intentional delta)

Extracted from `functions/src/ai/handlers/explainVerse.ts` (lines 138–143, 160–182), operating on
owner-readable `purchases/{uid}` (rules 90–93: `read` owner, `write: if false`):
- `currentPlan === 'lifetime'` → premium. (`'legacyPremium'` → premium **in the function**; see delta.)
- `currentPlan` not in `{monthly, yearly}` (and not lifetime/legacyPremium) → free.
- monthly/yearly: denied if `subscriptionStatus ∈ {'expired','refunded','revoked','paused'}`
  (`'cancelled'` deliberately NOT ended — auto-renew off retains access until period end), or if
  `subscriptionExpiryDate.toMillis() <= now`. Absent status/expiry → trusted active.

**Intentional delta (locked by D-5/FR-13)**: the deployed function also grants
`currentPlan === 'legacyPremium'`; the web resolver treats `legacyPremium` as **free**. This is a
product decision (cohort <1/1000, manual grant on request, bl3_deferred_note.md), not an oversight
— the delta is recorded in contracts/premium-resolution.md so a future diff against the function
isn't "fixed" back. Everything else replicates the function exactly.

**Refresh semantics**: resolved once per sign-in/page-load session (single doc read), cached in the
auth context; no realtime listener (badge is cosmetic, D-4).

## R-6: Auth state, returning users, and the zero-traffic invariant

**Decision**: an `AuthProvider` client context wraps the app shell. On mount it checks a
1-byte local marker (`localStorage: 'arabsyntax-auth' = '1'`, set on sign-in, cleared on sign-out).
Only if the marker is present does it dynamically import Firebase and attach `onAuthStateChanged`
(restoring the session via Firebase's own IndexedDB persistence). Visitors without the marker load
zero Firebase code and generate zero network traffic — FR-4/SC-7 hold structurally, and the
Lighthouse budget (Constitution IV) is untouched for anonymous traffic.

**Alternatives considered**: always attaching `onAuthStateChanged` — rejected: ships the SDK to
every visitor and performs token refresh traffic for signed-out users (violates FR-4's spirit and
the performance budget).

## R-7: Cross-provider account collision (FR-6)

**Decision**: catch `auth/account-exists-with-different-credential` from the sign-in call. With
"One account per email address" ENABLED (D-6), Google-vs-Apple collisions surface this code (Apple
private-relay emails never collide by construction). The error's `customData.email` +
`fetchSignInMethodsForEmail` identify the existing provider when available; the localized message
names the provider to try ("هذا البريد مسجل بالفعل — جرّب تسجيل الدخول عبر Apple" / "This email is
already registered — try signing in with Apple"). If the lookup fails (enumeration protection may
blank it), fall back to the generic-but-specific wording naming the *other* provider than the one
just attempted. Manual test with a real cross-provider account is launch gate G-4.

## R-8: Analytics events (FR-14)

Extracted contract (`lib/features/analytics/domain/model/analytics_event_login.dart` lines 14–21,
`analytics_parameter.dart`, `log_in_type.dart`, `analytics_operation_result.dart`):
- Event name `login`; params `method` ∈ {'phone','google','apple','username'} (web uses only
  'google'/'apple'), `result` ∈ {'success','failure'}.
- The app defines NO `sign_up` event — `sign_up` on web is additive-new (GA4's standard name),
  fired with the same `method` param when the profile upsert created `createdAt` (first-ever
  sign-in). Recorded in contracts/analytics-events.md; app-side wiring remains OPEN-3 (out of scope).
- `setUserId(uid)` after success.

**Cookie posture**: Firebase Analytics (GA4) is initialized only when a sign-in attempt starts —
never on page load — so anonymous browsing stays cookie-free (Constitution VI mitigation, recorded
in plan.md Complexity Tracking). Ops note: a Web App must be registered in the Firebase project to
obtain `measurementId` (folds into G-2/G-3 console work).

## R-9: Launch gating & configuration

**Decision**: `lib/featureFlags.ts` gains `webAccounts`, driven by `NEXT_PUBLIC_WEB_ACCOUNTS === 'true'`
at build time (SSG bakes it in; prod stays off until G-1..G-4 pass, dev/preview builds turn it on).
When off, the header renders no account UI, MarkComplete behaves exactly as today, and no Firebase
code is reachable. Firebase web config comes from `NEXT_PUBLIC_FIREBASE_*` env vars (public by
design; security lives in Firestore rules), documented in `.env.example` and quickstart.md.

**Alternatives considered**: runtime flag via Worker env — rejected: pages are static assets;
runtime flags would require client fetches or dynamic rendering for no benefit.

## R-10: Testing strategy

**Decision**:
- **Vitest (pure units, no emulator)**: entitlement resolver truth table (every plan × status ×
  expiry combination incl. the legacyPremium delta); profile payload builder (null-omission,
  createdAt-only-when-absent given a doc snapshot); progress merge planner (union computation,
  dot-path key generation, monotonicity — never emits a delete/false).
- **Playwright + Firebase Emulator Suite (auth + firestore)**: sign-in → `users/{uid}` doc shape
  (serverTimestamp fields, no nulls), completion round-trip (web write → doc has per-key timestamp
  value; pre-seeded app-style completions survive untouched), badge on/off from seeded
  `purchases/{uid}` docs, signed-out zero-request assertion (network interception).
- **Manual (gates)**: G-4 real cross-provider collision; visual RTL/LTR verification per
  constitution Definition of Done.

**Rationale**: the contracts are the risk surface; pure builders make them unit-testable without
network. The emulator suite is the only faithful way to test rules interaction + serverTimestamp
behavior without touching production data.
