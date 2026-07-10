# Feature Specification: Web Account Sync (Google/Apple Sign-In, Progress Sync, Premium Badge)

**Feature Branch**: `006-web-account-sync`
**Created**: 2026-07-10
**Status**: Draft
**Input**: User description: "Let a person use one account across app and web: sign in on alnahwalkafi.com with Google or Apple, sync lesson progress both ways, and see their premium status. Web is an acquisition and conversion surface; AI features remain app-exclusive." (Full directive with locked decisions D-1..D-6, functional requirements FR-1..FR-14, hard constraints C-1..C-6, launch gates G-1..G-4, non-goals, and open items OPEN-1..OPEN-4 — reproduced in the sections below.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One Account Across App and Web (Priority: P1)

A learner who already uses the mobile app visits alnahwalkafi.com and signs in with the same Google or Apple account they use in the app. They see they are signed in (account menu with their name), can sign out, and — if they mix providers by mistake — are guided to the correct one instead of hitting a dead-end error.

**Why this priority**: Everything else in this feature (progress sync, premium badge) requires a working, safe sign-in that shares identity with the app. It is also the conversion surface's foundation.

**Independent Test**: Can be fully tested by signing in on the web with Google and with Apple, verifying the account menu appears with the correct name, signing out, and verifying the same account later works in the mobile app with its profile intact.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor on any page, **When** they choose "Sign in with Google" and complete the provider flow, **Then** they are signed in, their name appears in the account menu, and their user profile record is created/updated per the write contract (C-1).
2. **Given** a signed-out visitor, **When** they choose "Sign in with Apple" and complete the flow, **Then** the same result holds; if Apple provides their name (first consent only), it is persisted, and a later web sign-in never erases it.
3. **Given** a user who registered in the app with Apple, **When** they attempt Google sign-in on web with the same email, **Then** they see a localized, specific message telling them to use Apple instead ("This email is already registered — try signing in with Apple") — never a generic error (FR-6, required by D-6).
4. **Given** a signed-in user, **When** they open the account menu and choose sign out, **Then** the session ends and the UI returns to the signed-out state.
5. **Given** a new user who signs up on web first, **When** they later sign into the mobile app, **Then** the app reads their profile correctly with the original creation timestamp preserved.
6. **Given** a browser that blocks the sign-in popup, **When** the user attempts sign-in, **Then** the flow falls back to a redirect and still completes.

---

### User Story 2 - Lesson Progress Follows the User (Priority: P2)

A signed-in learner sees the lessons they completed in the app reflected on the web lesson tree, and when they press the existing "Mark Complete" button on a web lesson, that completion shows up in the app after its next sync. A signed-out learner who presses "Mark Complete" is invited to sign in to save their progress.

**Why this priority**: Two-way progress sync is the core cross-platform value ("one account"), but it depends on US1's sign-in existing first.

**Independent Test**: Complete a lesson in the app, sign in on web and see it completed in the lesson tree; complete another lesson on web via the Mark Complete button, then open the app and see it completed there. Verify no previously app-recorded completion was lost.

**Acceptance Scenarios**:

1. **Given** a user with cloud progress from the app, **When** they sign in on web, **Then** the web lesson tree shows those lessons as completed (FR-7).
2. **Given** a signed-in user on a lesson page, **When** they press the existing Mark Complete button, **Then** exactly one cloud write records that completion, per-lesson-key merge only (FR-8, C-3), and the app sees it after its next sync.
3. **Given** a signed-in user who had completed lessons locally while signed out, **When** they sign in, **Then** their local completions are merged up to the cloud (union — nothing is removed) and the merged state is shown.
4. **Given** a signed-in user viewing a lesson they completed, **When** they look for a way to un-complete it, **Then** none is offered — cloud writes are monotonic in v1 (resolved OPEN-1b).
5. **Given** a signed-out visitor, **When** they press Mark Complete, **Then** the completion is stored locally exactly as today and a contextual "sign in to save your progress" prompt appears (resolved OPEN-4); no backend read/write and no auth session occurs (FR-4).
6. **Given** a signed-out visitor browsing lessons, **When** they read any lesson page, **Then** pages behave exactly as today — statically served, no regression to the ~100 static pages or their SEO (FR-9).

---

### User Story 3 - Premium Status Visible on Web (Priority: P3)

A signed-in subscriber opens the account menu on the web and sees a "Premium" label under their name. A lapsed subscriber does not see it. The label is purely cosmetic — it gates nothing.

**Why this priority**: Reinforces the conversion story ("your subscription is one account"), but the site is fully functional without it.

**Independent Test**: Sign in with an account holding an active monthly subscription and see the badge in the account menu; sign in with the same account after expiry and verify the badge is absent.

**Acceptance Scenarios**:

1. **Given** a signed-in user with a lifetime plan, **When** they open the account menu, **Then** the Premium label shows under their name (resolved OPEN-2).
2. **Given** a signed-in user with an active monthly/yearly subscription, **When** they open the account menu, **Then** the Premium label shows.
3. **Given** a signed-in user whose subscription status is ended or whose expiry is in the past, **When** they open the account menu, **Then** no Premium label shows (FR-12, C-2).
4. **Given** a signed-in legacy-premium user (D-5 cohort), **When** they open the account menu, **Then** they resolve as free — no attempt is made to read the restricted entitlements data (FR-13).
5. **Given** a free signed-in user, **When** they use the site, **Then** nothing is gated or degraded — the badge is cosmetic only (D-4).

---

### Edge Cases

- **Cross-provider email collision** (Apple-in-app, Google-on-web, same email): guided localized message per FR-6; manually tested before launch (G-4).
- **Apple name only on first consent**: second and later Apple sign-ins return no name; the write payload must omit absent fields so an existing name is never erased (C-1).
- **Popup blocked**: sign-in falls back to redirect (FR-1).
- **Sign-in succeeds but the profile upsert or progress read fails** (network drop): user remains signed in; the operation is retried or surfaced as a localized non-blocking error; no partial/corrupt writes.
- **Completion write fails offline**: the completion stays local; it is re-attempted (at latest, merged on next sign-in) — the user's press is never silently lost, and retries still produce per-key merges only.
- **Web-first account with empty cloud progress signing into an old app version**: the unpatched app wipes local progress (audit BL-1) — production launch is gated on the app-side fix being released (G-1).
- **Lapsed subscriber**: must not show the badge; resolution logic must consider ended status and expiry, never plan name alone (C-2).
- **legacyPremium cohort** (<1/1000): resolves as free on web; manual grant on request (D-5); no read of restricted entitlement records (FR-13).
- **Multiple tabs**: completion state stays consistent across tabs (existing local-store behavior is preserved).
- **Signed-out visitor**: zero backend reads/writes, zero auth sessions, no anonymous accounts — anonymous records would pollute re-engagement and metrics sweeps (FR-4, audit ND-4).
- **Un-complete attempts**: not offered while signed in (monotonic cloud writes); local-only un-toggle behavior for signed-out users is unchanged.

## Requirements *(mandatory)*

IDs below preserve the numbering of the source directive and readiness audit for traceability. FR-15..FR-18 are new requirements created by resolving the open items.

### Locked Decisions (do not re-open during implementation)

| # | Decision | Date |
|---|----------|------|
| D-1 | No AI features on web (no إعراب, no lesson-explain, no mistake analysis). Static إعراب section stays. | 2026-07-10 |
| D-2 | Providers on web: Google + Apple. No email/password, matching the app. | 2026-07-10 |
| D-3 | Web writes lesson-completion progress (not read-only). | 2026-07-10 |
| D-4 | Premium status is displayed on web (badge / "premium" label). Cosmetic only — gates nothing. | 2026-07-10 |
| D-5 | legacyPremium cohort (<1/1000) intentionally not resolved on web; manual grant on request. See bl3_deferred_note.md. | 2026-07-10 |
| D-6 | Firebase console: "One account per email address" is ENABLED (verified in console, 2026-07-10). Overrides the audit's code-based inference (ND-6). | 2026-07-10 |

### Functional Requirements

**Authentication**

- **FR-1**: Users MUST be able to sign in with Google on the web (popup flow with redirect fallback).
- **FR-2**: Users MUST be able to sign in with Apple on the web.
- **FR-3**: Signed-in users MUST be able to sign out from the account menu.
- **FR-4**: The web MUST NOT create anonymous auth sessions. Signed-out visitors browse lessons with no auth session and no backend reads or writes (audit ND-4: anonymous records would pollute re-engagement and metrics sweeps).
- **FR-5**: On successful sign-in, the system MUST upsert the user's profile record per the write contract in C-1.
- **FR-6**: The system MUST handle the account-exists-with-different-credential conflict with a clear, localized message telling the user which provider to try instead ("This email is already registered — try signing in with Apple/Google"). Never a generic error. (Required because of D-6; the mobile app has no handler for this error — zero grep hits — so web cannot copy app behavior here.)

**Progress sync**

- **FR-7**: On sign-in, the system MUST read the user's cloud progress and reflect lesson-completion state in the web lessons UI.
- **FR-8**: When a signed-in user completes a lesson on web, the system MUST write that completion to the same records/fields the app reads, per C-3. "Completed" on web = the user presses the existing explicit Mark Complete button on the lesson page (resolved OPEN-1).
- **FR-9**: Signed-out lesson reading MUST work exactly as today (statically served pages; no regression to the ~100 static pages or SEO).
- **FR-10**: The web MUST write lesson completions only — no quiz results, streaks, or audio positions in v1 (web has no quiz-sync/audio surfaces). It MUST NOT delete or zero any field it does not own.
- **FR-15** *(new; resolves OPEN-1 un-complete semantics)*: Cloud progress writes from web are monotonic — web only ever records completions, never removals. The un-complete affordance of the existing toggle is not offered to signed-in users in v1. Signed-out local behavior is unchanged.
- **FR-16** *(new; consequence of the sign-in nudge promise)*: On sign-in, lesson completions already stored locally on this browser MUST be merged into cloud progress (union, per-key merge writes per C-3); no cloud completion is ever removed by this merge.

**Premium badge**

- **FR-11**: Signed-in users with active premium MUST see a "Premium" label under their name in the account menu (resolved OPEN-2).
- **FR-12**: Premium resolution MUST follow C-2 exactly. A lapsed subscriber MUST NOT show the badge.
- **FR-13**: legacyPremium users resolve as free on web (D-5). No code path may attempt to read the restricted per-user entitlements records (that read is permission-denied by security rules; audit BL-3).

**Analytics**

- **FR-14**: The system MUST fire `login` (params: method ∈ {google, apple}; result ∈ {success, failure}) and `sign_up` events on web, matching the param shape of the app's (currently dead) login event definition, and set the analytics user id after sign-in. Additive only — no renames of anything existing. Known asymmetry: the app fires neither event today (audit ND-5); tracked as OPEN-3 (app-side, out of this spec's scope).

**Entry points**

- **FR-17** *(new; resolves OPEN-4)*: Sign-in is reachable from (a) a header button (desktop and mobile drawer) and (b) a contextual "sign in to save your progress" prompt shown when a signed-out user presses Mark Complete. No other entry points in v1.
- **FR-18** *(new; from C-6)*: All auth and account UI MUST respect the existing locale system (Arabic default, English at /en), be RTL-safe, and surface all user-facing errors localized in both Arabic and English.

### Hard Constraints (from the readiness audit — violating any of these is a defect)

- **C-1 — User-profile write contract** (audit BL-4): All writes to the user profile record are merge-writes, never full replacements. The creation timestamp is written only after a read confirms the record or the field is absent (mirror the app's profile repository behavior, `firestore_user_profile_repository.dart:32-33`). Creation and last-sign-in timestamps are server-generated timestamps — never ISO strings or milliseconds (the app's reader hard-casts the timestamp type and permanently fails otherwise). Null fields are omitted from the payload, never written — critical for Apple, which returns the display name only on first consent; writing null would erase a name the app wrote. If Apple provides a name on first consent, persist it then.
- **C-2 — Entitlement resolver** (audit BL-2): Never derive premium from the purchase record's plan name alone — it never downgrades. Replicate the logic of `hasPremiumEntitlement()` (`functions/src/ai/handlers/explainVerse.ts:160-182`): grant if plan is lifetime; if monthly/yearly, deny when the subscription status is an ended status or the expiry is at/before now. All needed fields are on the owner-readable purchase record (`firestore.rules:90-93`). No rules or schema changes.
- **C-3 — Progress write shape**: Match the app's steady-state pattern: per-lesson-key field merges (see `mergeLessonCompletions`, `firestore_progress_sync_repository.dart:264-267`) — never replace the whole completed map. One write per completion event, not per scroll/interaction. Never do anything equivalent to the app's full-map-replace path.
- **C-4 — Provider field semantics** (audit ND-3): If written at all, it is a last-used marker with values exactly `google` / `apple` (lowercase, matching the app's enum serialization). Any "signed in with…" UI reads the live auth session's provider data, not this stored field.
- **C-5 — No new collections, no new fields on shared records, no security-rule changes** in this feature. If implementation appears to require any, stop and escalate — that is a spec gap, not an implementation call.
- **C-6 — Locale/UI**: Auth and account UI respect the existing locale system and logical (RTL-safe) layout properties. Errors surfaced to users are localized (ar + en). (Restated as FR-18.)

### Launch Gates (block enabling sign-in in production, not development)

- **G-1**: App-side BL-1 fix merged and released — the app must stop wiping local progress when the cloud snapshot is empty (`load_cloud_progress_use_case.dart:25-64` + confirm-switch flow). Rationale: web-first accounts make "existing account, empty cloud" a common state; unpatched app versions destroy guest progress on first sign-in to such an account. D-3 softens but does not remove this: a web-first user who completed zero lessons still has an empty snapshot. Older installed app versions remain at risk after release — mitigate by shipping the fix well before any web sign-in marketing push.
- **G-2**: Apple ops — Services ID created, alnahwalkafi.com return URL registered with Apple, Apple provider's web configuration completed in the auth console.
- **G-3**: Google ops — alnahwalkafi.com added to the authorized sign-in domains; OAuth consent screen verified for production.
- **G-4**: FR-6 error path manually tested with a real cross-provider account (Apple-in-app, Google-on-web, same email).

### Key Entities

- **User profile record** (`users/{uid}`): shared identity record read and written by both app and web. Attributes relevant here: display name, creation timestamp, last-sign-in timestamp, optional last-used-provider marker. Web writes are merge-only per C-1.
- **Lesson progress records** (`users/{uid}/progress/*`): per-user cloud completion state keyed by lesson id — the same lesson ids used by the app and by the web lesson tree/quiz bank. Web reads all, writes completions only, per-key, monotonic (C-3, FR-15).
- **Purchase record** (`purchases/{uid}`): owner-readable record holding plan, subscription status, and expiry — the sole source for premium resolution on web (C-2). Read-only for web.
- **Restricted entitlement records** (`users/{uid}/entitlements/**`): permission-denied to clients; explicitly never read by web (FR-13, D-5).
- **Web local progress store**: existing browser-local set of completed lesson ids driving the lesson-tree unlock loop. Remains the store for signed-out visitors; merged into cloud on sign-in (FR-16).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-1**: A user can complete web sign-in (either provider) and see their signed-in account menu in under 30 seconds from clicking the sign-in button, including the provider consent step.
- **SC-2**: 100% of lessons completed on web by a signed-in user appear as completed in the app after the app's next sync, and vice versa — verified over a test matrix of app-first, web-first, and mixed accounts.
- **SC-3**: Zero lesson completions previously recorded by the app are lost or overwritten by any web write, across all acceptance test runs.
- **SC-4**: An Apple user's display name survives any number of subsequent web sign-ins (0 name-erasure incidents).
- **SC-5**: Premium badge accuracy is 100% against the resolution rules: active lifetime/monthly/yearly show it; ended or expired subscriptions and legacy-premium accounts do not.
- **SC-6**: 100% of cross-provider collision attempts show the specific localized guidance message; 0 show a generic error.
- **SC-7**: Signed-out browsing produces zero backend reads/writes and zero auth sessions (verified by network inspection), and the ~100 lesson pages remain statically served with unchanged SEO signals.
- **SC-8**: `login` and `sign_up` analytics events appear with the correct method and result params for every sign-in attempt, and are joinable to a user id after success.

## Resolved Open Items

| Item | Resolution (2026-07-10, product decision) |
|------|-------------------------------------------|
| OPEN-1 | "Completed" on web = pressing the existing explicit Mark Complete button on the lesson page. Cloud writes are monotonic; the un-complete side of the existing toggle is not offered to signed-in users in v1 (→ FR-8, FR-15). |
| OPEN-2 | Premium badge = "Premium" label under the display name inside the signed-in account menu. No profile page in v1 (→ FR-11). |
| OPEN-3 | App-side wiring of the dead login/set-user analytics — remains open, tracked as a separate app-side PR (decide whether it rides with the BL-1 release). Out of this spec's scope; noted in FR-14. |
| OPEN-4 | Sign-in entry points = header button (desktop + mobile drawer) plus contextual "sign in to save your progress" prompt when a signed-out user presses Mark Complete (→ FR-17). |

## Out of Scope (explicit, per scope discipline)

- No AI surfaces of any kind (D-1).
- No payments/subscription purchase on web.
- No reads of restricted per-user entitlement records and no security-rules work (D-5).
- No anonymous auth; no cloud persistence of guest progress (browser-local guest progress stays as-is).
- No push/notification work; no notification-token writes from web.
- No quiz-result, streak, or audio-position sync on web.
- No changes to the mobile app in this spec (the BL-1 fix is a separate app-side PR with its own directive; it gates launch via G-1).
- No analytics schema work beyond FR-14's additive events.

## Assumptions

- The existing Mark Complete button and browser-local progress store (shipped with the interactive lesson tree) remain the web's completion mechanism; this feature attaches cloud sync to it rather than introducing new completion UX.
- Web lesson ids match the lesson keys used in the app's cloud progress records (the quiz bank already carries lesson ids matching lesson ids).
- The sign-in nudge's promise ("save your progress") implies uploading the browser's existing local completions on sign-in; this is safe because the merge is a union of completions and never removes anything (FR-16).
- Development/staging can enable sign-in before launch gates G-1..G-4 are met; the gates block production enablement only.
- Manual premium grants for the legacy-premium cohort are handled by support outside this feature (D-5).
- The account menu (header) is the home for sign-in state, sign-out, and the premium label; no dedicated account/profile page exists in v1.

## Dependencies

- App-side BL-1 fix (progress-wipe on empty cloud snapshot) must be released before production launch (G-1).
- Provider-side operations: Apple Services ID + return URL registration; sign-in domain authorization and OAuth consent verification (G-2, G-3).
- Readiness audit artifacts referenced by the constraints (BL-2, BL-3, BL-4, ND-3, ND-4, ND-5, ND-6, SAFE-2; bl3_deferred_note.md) are the authoritative source for the cross-platform contracts cited in C-1..C-4.
