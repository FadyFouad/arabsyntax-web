# Quickstart: Web Account Sync (006)

## Prerequisites

- Node ≥ 22, repo installed (`npm i`)
- Firebase CLI (`npm i -g firebase-tools`) for the Emulator Suite
- Access to the shared Firebase project (same project as the mobile app) — needed only for
  real-provider testing; day-to-day dev uses emulators

## Environment

Add to `.env.local` (all public by design; security lives in Firestore rules):

```bash
# Launch-gate flag — accounts UI + Firebase code are unreachable unless 'true' (baked at build time)
NEXT_PUBLIC_WEB_ACCOUNTS=true

# Firebase web app config (Firebase console → Project settings → Your apps → Web)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=            # <project>.firebaseapp.com (dev); alnahwalkafi.com once the /__/auth proxy exists (prod redirect fallback)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=         # analytics (login/sign_up events)

# Point the SDK at local emulators instead of production (dev only)
NEXT_PUBLIC_FIREBASE_EMULATORS=true
```

`NEXT_PUBLIC_WEB_ACCOUNTS` stays **unset in production** until launch gates G-1..G-4 pass
(spec.md → Launch Gates).

## Run against emulators

```bash
firebase emulators:start --only auth,firestore --project demo-arabsyntax
npm run dev
```

Seed helpers (see `tests/` fixtures once implemented):
- App-style progress doc: `users/<uid>/progress/lesson_completion` with
  `completed: { elm_alnaho: <Timestamp>, aqsam_kalam: '2026-01-01T00:00:00.000Z' }` (both value
  forms, deliberately).
- Purchases docs for badge states: `{currentPlan:'lifetime'}`, `{currentPlan:'monthly',
  subscriptionStatus:'cancelled', subscriptionExpiryDate:<future>}`,
  `{currentPlan:'monthly', subscriptionStatus:'expired'}`, `{currentPlan:'legacyPremium'}` (must
  show NO badge — D-5 delta).

## Verify the invariants (map to spec success criteria)

1. **SC-7 zero-traffic**: open any lesson page signed out with DevTools → Network: no
   `firestore.googleapis.com` / `identitytoolkit` / `firebaseinstallations` requests, no Firebase
   chunks loaded, no cookies set. HTML identical to a build with the flag off.
2. **Sign-in (US1)**: header → sign in with Google (emulator fake account) → account menu shows
   name; emulator UI shows `users/{uid}` with `createdAt`/`lastSignInAt` as **timestamp** type
   (not string), no null fields; second sign-in does not re-write `createdAt`.
3. **Progress round-trip (US2)**: with the seeded doc, the lesson tree shows both seeded lessons
   completed; press Mark Complete on a third lesson → doc gains `completed.<slug>` (timestamp
   value) and the two seeded entries are untouched; no whole-map replacement (check via emulator
   request log or doc shape).
4. **Union merge (FR-16)**: complete a lesson while signed out, then sign in → the id appears in
   the cloud doc; nothing was removed from either side.
5. **Monotonic (FR-15)**: while signed in, the un-complete affordance is absent.
6. **Badge (US3)**: seeded purchases docs above produce badge / no-badge exactly per
   contracts/premium-resolution.md truth table.
7. **FR-6**: real-provider test only (G-4) — Apple-in-app account, Google-on-web, same email →
   localized guidance naming the other provider.

## Tests

```bash
npm run test        # vitest units: entitlement truth table, profile payload builder, merge planner
npm run test:e2e    # playwright (starts emulators; see playwright config once implemented)
npm run lint && npm run typecheck
```

## RTL/i18n check (constitution)

Verify the account menu, sign-in dialog, nudge, and every error string in both `/` (ar, RTL) and
`/en` (LTR). All strings live under `auth.*` in `messages/{ar,en}.json`.

## Production enablement (later — not part of implementation)

1. G-1: app BL-1 fix released. 2. G-2/G-3: Apple Services ID + return URL, authorized domains,
   OAuth consent, Web App registration (measurementId), optional `/__/auth` same-origin proxy for
   the redirect fallback. 3. G-4: manual cross-provider test. 4. Set `NEXT_PUBLIC_WEB_ACCOUNTS=true`
   in the production build environment and deploy (`npm run deploy`).
