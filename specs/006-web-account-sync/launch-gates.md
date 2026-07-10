# Launch Gates — Web Account Sync (006)

The feature ships behind `NEXT_PUBLIC_WEB_ACCOUNTS`, unset in production. This
file is the checklist for turning it on. Gates G-1..G-4 (spec.md → Launch Gates)
block **production enablement only** — development and preview builds can and do
run with the flag on today.

Nothing here is code work: the implementation is complete and merged behind the
flag. These are the operational and cross-team preconditions.

## Gates

### G-1 — App-side BL-1 fix released

The mobile app must stop wiping local guest progress when the cloud snapshot is
empty (`load_cloud_progress_use_case.dart:25-64` + the confirm-switch flow). A
separate app-side PR with its own directive; this feature does not include it.

- [ ] BL-1 fix merged in the app repo
- [ ] Released to production and rolled out to the installed base **before** any
      web sign-in marketing push (older installed versions stay at risk until
      users update — D-3 softens this but does not remove it)

### G-2 — Apple sign-in ops

- [ ] Apple Services ID created
- [ ] `alnahwalkafi.com` return URL registered with Apple
- [ ] Apple provider's web configuration completed in the Firebase Auth console

### G-3 — Google sign-in ops + Web App registration

- [ ] `alnahwalkafi.com` added to Firebase Auth **authorized domains**
- [ ] OAuth consent screen verified for production
- [ ] A **Web App** registered in the Firebase project — this is what mints the
      `measurementId` the analytics events need (contracts/analytics-events.md).
      Without it, `login`/`sign_up` silently no-op (auth still works).

### G-4 — Cross-provider collision, manually tested

FR-6 cannot be emulator-tested end to end (it needs two real provider accounts on
one email). With a real Apple-in-app + Google-on-web account sharing an email:

- [ ] Google-on-web sign-in surfaces the localized guidance naming **Apple**, not
      a generic error
- [ ] The reverse (Apple-on-web against a Google-registered email) names **Google**

## Redirect-fallback ops (optional at launch — popup works without it)

The popup sign-in flow needs none of this. The `signInWithRedirect` FALLBACK
(research.md R-2), used when a browser blocks the popup, breaks in browsers that
partition third-party storage (Safari, Firefox) unless the auth helper is served
same-origin:

- [ ] Cloudflare route/origin rule proxying `/__/auth/*` to
      `demo-arabsyntax.firebaseapp.com` (substitute the real project)
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` set to `alnahwalkafi.com` in the prod build

Ship popup-first; add this when redirect-fallback reliability on partitioned
browsers becomes a priority.

## Production enablement

Once G-1..G-4 are green:

1. Set the Firebase web config vars in the production build environment
   (`NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_APP_ID` /
   `_MEASUREMENT_ID`) — all public by design; security lives in Firestore rules.
2. Set `NEXT_PUBLIC_WEB_ACCOUNTS=true`.
3. Leave `NEXT_PUBLIC_FIREBASE_EMULATORS` **unset**.
4. Deploy: `npm run deploy`.

## What is verified in CI (no gate needed)

- Zero-traffic / byte-identical signed-out HTML with the flag on and off (T029).
- Cross-platform Firestore write contracts — profile, progress, premium — against
  the emulator suite (`npm run test:e2e:auth`).
- Pure contract logic (payload builder, merge planner, premium resolver, error
  mapper) in the Vitest suite.
