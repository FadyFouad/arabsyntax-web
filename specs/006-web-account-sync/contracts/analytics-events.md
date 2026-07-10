# Contract: web analytics events

**Source of truth**: `arabsyntax` app repo, `lib/features/analytics/domain/model/analytics_event_login.dart`
(lines 14–21), `analytics_parameter.dart`, `log_in_type.dart`, `analytics_operation_result.dart`.
Audit ref: ND-5 / FR-14. Additive only — no renames of anything existing.

## Reference definition (app — currently dead code, kept as the shape authority)

- Event name: `login`
- Params: `method` ∈ {`phone`, `google`, `apple`, `username`}, `result` ∈ {`success`, `failure`}

The app defines **no** `sign_up` event; `sign_up` below is web-new (GA4 standard name), additive.

## Web events

| Event | When | Params |
|-------|------|--------|
| `login` | Every sign-in attempt resolution (per provider attempt) | `method`: `'google'`\|`'apple'`; `result`: `'success'`\|`'failure'` |
| `sign_up` | Success where the profile upsert set `createdAt` (first-ever sign-in for this uid) | `method`: `'google'`\|`'apple'` |

- After success: `setUserId(uid)`.
- A popup abandoned by the user (`auth/popup-closed-by-user`) counts as `result: 'failure'`; a
  popup→redirect fallback counts once, on the resolution of the redirect result.
- The FR-6 cross-provider collision is a `failure` for the attempted method.

## Initialization & privacy posture

- Firebase Analytics is initialized lazily, **only when a sign-in attempt starts** — never on page
  load. Anonymous browsing sets no analytics cookies/storage (constitution VI mitigation; see
  plan.md Complexity Tracking).
- If analytics is unavailable (blocked, unsupported environment via `isSupported()` false), all
  calls no-op silently — analytics failures must never affect the auth flow.
- Known asymmetry: the app fires neither event today (audit ND-5); app-side wiring is OPEN-3, a
  separate app-side PR. Web ships its side regardless so funnels are comparable once the app catches up.

## Ops prerequisite

A Web App registration in the Firebase project (provides `measurementId`) — folded into the
G-2/G-3 console checklist.
