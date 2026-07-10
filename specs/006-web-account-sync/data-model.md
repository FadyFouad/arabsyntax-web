# Data Model: Web Account Sync

**Feature**: 006-web-account-sync | **Date**: 2026-07-10

All Firestore shapes are owned by the mobile app / backend; web is a conforming client (C-5: no new
collections, no new fields on shared documents, no rules changes). Authoritative excerpts live in
[contracts/](./contracts/).

## Firestore entities (shared with the app)

### `users/{uid}` — user profile

| Field | Type | Web writes? | Notes |
|-------|------|-------------|-------|
| `email` | string | yes (on sign-in) | From the auth user; omitted if absent |
| `displayName` | string | yes, only when non-null | Apple returns it on first consent only; never write null (C-1) |
| `provider` | `'google'`\|`'apple'` | yes (on sign-in) | Last-used marker only; UI reads `providerData` instead (C-4) |
| `createdAt` | Timestamp (server) | yes, only if absent | Read-before-write; app reader hard-casts `as Timestamp` |
| `lastSignInAt` | Timestamp (server) | yes (every sign-in) | Same hard-cast constraint |
| `lastSignOutAt` | Timestamp (server) | yes (on sign-out) | Mirrors app behavior |
| `reengagementPushCount`, `lastReengagementPushAt` | — | **NEVER** | Server-owned; rules reject any client write touching them |
| *(any other field)* | — | never | FR-10: web must not delete/zero fields it does not own; merge-writes only |

**Validation**: payload built by a pure builder that (a) drops null/undefined entries, (b) includes
`createdAt` only when a fresh read shows doc-missing or field-absent, (c) always uses
`serverTimestamp()` sentinels for the three timestamp fields.

### `users/{uid}/progress/lesson_completion` — lesson completions

| Field | Type | Web writes? | Notes |
|-------|------|-------------|-------|
| `completed` | map<slug lessonId → Timestamp \| ISO-8601 string> | per-key only | Dot-path merge (`completed.<lessonId>`); web writes `serverTimestamp()` values; reader (both platforms) tolerates both value types |
| `updatedAt` | Timestamp (server) | yes (with every write) | |

**State transitions (web)**: absent → completed (timestamp). No other transition exists on web
(FR-15 monotonic: no removal, no false, no delete sentinel — ever).

**Sibling docs** `quiz_results`, `streak_data`, `audio_positions`: read-never, write-never on web (FR-10).

### `purchases/{uid}` — entitlement source (read-only; rules forbid client writes)

| Field | Type | Used how |
|-------|------|----------|
| `currentPlan` | `'lifetime'`\|`'legacyPremium'`\|`'monthly'`\|`'yearly'`\|other | `lifetime` → premium; `legacyPremium` → **free on web** (D-5 delta); `monthly`/`yearly` → check below; other/absent → free |
| `subscriptionStatus` | string \| null | Ended set: `expired`, `refunded`, `revoked`, `paused` → free. `cancelled` is NOT ended |
| `subscriptionExpiryDate` | Timestamp \| null | `toMillis() <= now` → free; absent → trusted active |

### `users/{uid}/entitlements/**` — explicitly untouched

No web code path references it (FR-13). (Note: the app repo's current rules file has no
`entitlements` match block; the operative fact is unchanged — web never reads it.)

## Web-local entities

### Local completion store (existing, extended semantics)

- `localStorage['arabsyntax-lesson-progress']`: sorted JSON array of slug lessonIds (unchanged
  format; `lib/lessons/progress/state.ts` stays the pure model).
- Signed out: sole source of truth (unchanged behavior, un-toggle still allowed locally).
- Signed in: holds the **union** (local ∪ cloud) after sign-in merge; every cloud pull unions into
  it (never removes); MarkComplete writes to both local and cloud.

### Auth session marker (new)

- `localStorage['arabsyntax-auth'] = '1'` — set on successful sign-in, cleared on sign-out.
  Presence is the only trigger for loading Firebase on page load (R-6). Not authoritative — it
  only gates SDK bootstrapping; the real session lives in Firebase's own persistence.

### AuthProvider context state (in-memory)

| Field | Type | Source |
|-------|------|--------|
| `status` | `'disabled'` \| `'signedOut'` \| `'loading'` \| `'signedIn'` | flag + marker + `onAuthStateChanged` |
| `user` | `{ uid, displayName, email, photoURL, providerId }` \| null | `auth.currentUser` (+ `providerData` for any "signed in with…" UI, per C-4) |
| `isPremium` | boolean | Entitlement resolver, once per session (R-5) |
| `syncState` | `'idle'` \| `'merging'` \| `'error'` | Sign-in union merge lifecycle (FR-16); errors are localized and non-blocking |

## Relationships

```
auth uid ──1:1── users/{uid} ──1:1── users/{uid}/progress/lesson_completion
     │                                        ▲ union merge on sign-in (FR-16)
     └──1:1── purchases/{uid} (read-only)     │
                                     localStorage completion set (per-browser)
```

## Lesson id invariant

Web tree node `id` === `lessonId` === app's `completed` map key === slug (`elm_alnaho`, …).
Verified identical in `content/lessons/tree.json` (web) and `assets/lesson_tree/tree.json` (app).
If a future schema breaks this equality, the unlock/mapping note in
`lib/lessons/progress/state.ts` applies to cloud sync too.
