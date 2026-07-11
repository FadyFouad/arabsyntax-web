# Feature 008 — Post-Sign-In Profile Form (web, skippable)

Single-concern addition extending feature `006-web-account-sync`. This spec is the
recorded directive that resolves spec 006's **C-5 escalation** ("no new fields on shared
documents without a separate decision"): the fields below are approved, exactly as listed,
and nothing else.

## What

After a successful Google/Apple sign-in on `alnahwalkafi.com`, show a short, **skippable**
profile form. Web-only in v1 — the mobile app neither shows nor depends on any of this.

## When the form shows

Show when BOTH are true for the signed-in user's `users/{uid}` document:

1. `learnerProfile` (map, below) is absent, AND
2. `learnerProfileSkippedAt` is absent.

It shows after first sign-in, again on later sign-ins only if the user neither completed
nor skipped it, and never again once either happened — consistent across browsers and
devices because both markers live on the document, not in local storage. Not gated on any
notion of "new user". The form must never block navigation.

## Fields

All stored under ONE new map field `users/{uid}.learnerProfile`, written in a single merge
write on submit. Stored values are English snake_case enums; labels localized (ar + en)
via next-intl. Every field individually optional.

| Key | Type | Values | UI |
|---|---|---|---|
| `goal` | string | `thanaweya` \| `quran` \| `language_improvement` \| `general_interest` | single-select, first question |
| `level` | string | `beginner` \| `intermediate` \| `advanced` | single-select |
| `country` | string | ISO 3166-1 alpha-2 (e.g. `EG`, `SA`) | searchable select; Arabic country names; no default preselection |
| `schoolStage` | string | `sec_1` \| `sec_2` \| `sec_3` | single-select — shown only when `goal == thanaweya`; cleared from the payload if goal changes away |
| `source` | string | `search` \| `app` \| `social_media` \| `friend` \| `teacher` \| `other` | single-select, "How did you hear about us?" |
| `updatedAt` | timestamp | `serverTimestamp()` | not shown |

**Name (special case — NOT part of `learnerProfile`):** a free-text name input appears at
the top of the form only when `auth.currentUser.displayName` is null/empty (the Apple
case). If provided, it is written to the existing top-level `displayName` field. It must
NEVER overwrite an existing non-empty `displayName`, and per C-1 it is omitted from the
payload when empty — never written as null or `""`.

## Skip behavior

- A clearly visible skip affordance ("تخطي" link + close button), no dark patterns.
- Skipping performs exactly one merge write: `learnerProfileSkippedAt: serverTimestamp()`.
- Skipping fires the analytics event and closes the form. No other side effects.
- A later "fill it in from settings" entry point is out of scope for v1 (known limitation).

## Analytics (additive only)

- `profile_form_shown` (no params)
- `profile_form_completed` (params: `fields_filled`: int, `goal`: string|`none`)
- `profile_form_skipped` (no params)
- On completion, set user property `learning_goal` to the `goal` value when provided.

## Hard constraints (inherited from spec 006)

- **C-1**: `setDoc(..., { merge: true })` only; `serverTimestamp()` for all timestamps;
  null/empty fields omitted from payloads, never written.
- Exactly ONE Firestore write on submit and ONE on skip. No per-field writes, no writes on
  open. No writes of any kind for signed-out visitors.
- No new collections, no security-rule changes, no reads/writes outside `users/{uid}`.
- `learnerProfile` and `learnerProfileSkippedAt` are the ONLY schema additions (the app's
  reader ignores unknown fields — audit SAFE-3).
- Localized ar + en, RTL-safe (logical Tailwind properties), design-system tokens only.

## Non-goals

No app-side collection/display, no personalization consuming these fields yet, no
edit-profile settings page, no mandatory steps, no re-prompting cadence, no email capture.

## Implementation notes (decisions made during build)

- **Any dismissal is a skip**: the skip link, close button, Escape, and backdrop click all
  perform the single skip write. Rationale: the alternative (dismiss without writing)
  would re-show the form on every page load until answered — a nagging pattern the
  directive forbids.
- **localStorage read-avoidance hint** (`arabsyntax-profile-form-done`, value = uid): set
  only after the document marker is known to exist (observed by read, or written by this
  browser), so it can never suppress a form the document says should show. It only spares
  a `users/{uid}` read per page load. The markers of record stay on the document.
- Country names come from `Intl.DisplayNames` (CLDR) at runtime — only ISO codes ship in
  the bundle (`lib/countries.ts`); the stored value is the alpha-2 code.
- Payload logic lives in the pure builder `lib/firebase/contracts/learnerProfilePayload.ts`
  (unit-tested to 100%, mirroring feature 006's contract layout); Firestore I/O in
  `lib/firebase/learnerProfile.ts` is covered by the emulator e2e suite
  (`e2e/auth/profile-form.spec.ts`).
