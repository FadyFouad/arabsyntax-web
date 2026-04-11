---
description: "Task list for Support Page with Contact Form"
---

# Tasks: Support Page with Contact Form

**Feature**: 004-support-page | **Branch**: main
**Input**: Design documents from `/specs/004-support-page/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md
**Tests**: Not requested. Verification is manual per `quickstart.md`.

**Organization**: Tasks are grouped by user story so each story can be delivered and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1, US2, US3, US4)
- Exact file paths are included in every task

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and register translation scaffolding. No business logic yet.

- [x] T001 Install runtime dependencies: run `npm install zod react-hook-form @hookform/resolvers resend @upstash/ratelimit @upstash/redis` from the repo root
- [x] T002 Create `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/.env.example` documenting `RESEND_API_KEY`, `SUPPORT_EMAIL`, `UPSTASH_REDIS_REST_URL` (optional), `UPSTASH_REDIS_REST_TOKEN` (optional) with comments explaining which are required locally vs. in production
- [x] T003 [P] Add the complete `support.*` namespace (title, description, responseTime, directEmail.label, form.labels.*, form.placeholders.*, form.errors.* including `nameRequired`, `nameMin`, `emailRequired`, `emailInvalid`, `subjectRequired`, `subjectMin`, `messageRequired`, `messageMin`, `rateLimited`, `sendFailed`, form.submit, form.submitting, form.success.heading, form.success.body, form.success.sendAnother) to `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/messages/ar.json`
- [x] T004 [P] Add the same `support.*` namespace with English translations to `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/messages/en.json` (keys must match `ar.json` exactly)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities consumed by the Server Action. MUST complete before any user story phase starts.

**⚠️ CRITICAL**: User Story phases (3–6) cannot begin until this phase is complete.

- [x] T005 [P] Create the shared zod schema at `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/lib/validation/contact.ts` exporting `contactSchema` (name 2–100, email valid+≤254, subject 3–200, message 10–5000, website honeypot `max(0)`) with message keys (`nameRequired`, `nameMin`, `emailRequired`, `emailInvalid`, `subjectRequired`, `subjectMin`, `messageRequired`, `messageMin`) and the inferred type `ContactFormData` per `data-model.md`
- [x] T006 [P] Create the Resend wrapper at `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/lib/email/resend.ts` exporting `sendContactEmail(submission)` that reads `RESEND_API_KEY` and `SUPPORT_EMAIL` from env, sends with `from: "ArabSyntax Support <support@arabsyntax.com>"`, `replyTo` = visitor's email, subject `[ArabSyntax Support] ${subject}`, and the HTML table body per `data-model.md`; returns `{ ok: boolean; error?: string }`
- [x] T007 [P] Create the rate limiter at `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/lib/ratelimit.ts` exporting `checkRateLimit(ip)` that uses `@upstash/ratelimit` with a 5-per-hour sliding window when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set, otherwise falls back to a no-op that always returns `{ success: true }` (explicitly commented as local-dev only)
- [x] T008 Create the Server Action at `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/app/actions/contact.ts` with `'use server'`; `submitContact(data: ContactFormData): Promise<ContactActionResult>` that (1) parses with `contactSchema.safeParse`, returning `{ success: false, error: 'validation_error' }` on failure, (2) silently returns `{ success: true }` if the honeypot `website` field is non-empty, (3) reads client IP from `headers().get('x-forwarded-for')` (fallback `'127.0.0.1'`) and calls `checkRateLimit`, returning `{ success: false, error: 'rate_limited' }` on rejection, (4) calls `sendContactEmail` with the enriched submission (locale from `getLocale()`, timestamp ISO, ip), returning `{ success: false, error: 'send_failed' }` on failure, else `{ success: true }` — depends on T005, T006, T007

**Checkpoint**: Foundation ready. User Story implementation can now begin.

---

## Phase 3: User Story 1 — Send a Support Message (Priority: P1) 🎯 MVP

**Goal**: A visitor can open `/support`, fill the form with valid data, submit, and see an inline success confirmation while the developer receives an email. Server-side validation, rate limiting, and email failure handling are all wired — the form works end-to-end for the happy path and returns clear generic errors for the server-rejected paths.

**Independent Test**: Load `/support`, fill all four fields with valid data, click Submit — the developer's inbox receives the email within 60 seconds and the form is replaced by an inline success message. If `RESEND_API_KEY` is set to an invalid value, a friendly error message appears above the form while field values remain intact.

- [x] T009 [US1] Create `components/forms/ContactForm.tsx` (marked `'use client'`) at `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/components/forms/ContactForm.tsx` using `useForm<ContactFormData>` with `zodResolver(contactSchema)`, uncontrolled inputs for Name/Email/Subject/Message, a submit handler that calls `submitContact(values)` from `app/actions/contact.ts`, and a status state machine `'idle' | 'submitting' | 'success' | { error: 'rate_limited' | 'send_failed' | 'validation_error' }`; all user-visible strings via `useTranslations('support.form')`; fields use logical `text-start`; submit button is full-width on mobile and `sm:w-auto ms:ms-auto` on desktop
- [x] T010 [US1] In the same `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/components/forms/ContactForm.tsx`, add the success UI path: when status is `'success'`, replace the form with an inline card that announces via `role="status"` containing `support.form.success.heading`, `support.form.success.body`, and a "Send another" button (`support.form.success.sendAnother`) that resets the form state back to `'idle'` and calls `reset()` from react-hook-form
- [x] T011 [US1] In the same `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/components/forms/ContactForm.tsx`, add the error banner UI: when status is an error object, render a red card above the form with `role="alert"` showing the translated error string from `support.form.errors.{rateLimited|sendFailed}` (map `send_failed` and `validation_error` both to `sendFailed`); the submit button re-enables and `getValues()` keeps all field values intact
- [x] T012 [US1] Create the Support page at `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/app/[locale]/support/page.tsx` as an async Server Component: `await params` for `locale`, call `setRequestLocale`, render `<Container>` with `SectionHeading` using `support.title` / `support.description`, a response-time line from `support.responseTime`, and `<ContactForm />`; export `generateMetadata` with title, description, canonical, and hreflang alternates following the pattern from `app/[locale]/privacy/page.tsx`
- [x] T013 [US1] Update `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/components/layout/Footer.tsx` so the Support column links to `/support` (locale-aware via `next-intl` `Link`); verify the link text is sourced from an existing `footer.*` message key and the href resolves correctly for both `ar` (`/support`) and `en` (`/en/support`)

**Checkpoint**: User Story 1 fully functional — submit with valid data sends the email and shows success; invalid data, rate-limited, or failed send all surface a friendly generic error message without breaking the form state.

---

## Phase 4: User Story 2 — Validate Before Submitting (Priority: P1)

**Goal**: Client-side per-field validation runs before the submit request is made. Invalid fields show translated error messages linked to the input via `aria-describedby`. A honeypot field silently blocks naive bots. A bot filling only the honeypot sees a fake success response without triggering an email.

**Independent Test**: (a) Submit the form empty — every field shows its required-field error in the current language with no network request sent. (b) Enter `notanemail` in the email field — only the email shows an invalid-email error. (c) Via DevTools, set the hidden `website` input's value to `"spam"` and submit — the form shows the success card, but the developer's inbox receives nothing.

- [x] T014 [US2] In `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/components/forms/ContactForm.tsx`, wire per-field error rendering: each `<label htmlFor>` pairs with its `<input id>`; every field has an `aria-describedby` pointing to a `<p id={...-error}>` that renders the translated error string via a mapping table `{ nameRequired, nameMin, emailRequired, emailInvalid, subjectRequired, subjectMin, messageRequired, messageMin }` → `t('errors.<key>')` from react-hook-form's `formState.errors[field].message`; error paragraphs are `aria-live="polite"` so screen readers announce them on appearance
- [x] T015 [US2] In `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/components/forms/ContactForm.tsx`, add the honeypot field: `<div className="absolute -top-96 opacity-0 pointer-events-none" aria-hidden="true"><label><input {...register('website')} tabIndex={-1} autoComplete="off" /></label></div>`; the field uses logical positioning (not `display:none`) per constitution §VI; verify keyboard Tab skips it
- [x] T016 [US2] In `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/components/forms/ContactForm.tsx`, distinguish rate-limit error rendering: when the server action returns `{ success: false, error: 'rate_limited' }`, the error banner shows `t('errors.rateLimited')` instead of the generic `sendFailed` message, while keeping field values intact so the visitor can retry later

**Checkpoint**: Form validation works end-to-end in both locales. Bots are silently blocked. Rate-limit errors display their own translated message.

---

## Phase 5: User Story 3 — Self-Serve via FAQ (Priority: P2)

**Goal**: The same FAQ content from the landing page appears below the contact form on the Support page, letting visitors find answers without submitting the form.

**Independent Test**: Load `/support` and scroll past the form — the FAQ section renders with the same questions and answers as the landing page FAQ, in the current locale. All accordions expand/collapse correctly.

- [x] T017 [US3] In `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/app/[locale]/support/page.tsx`, import `FAQ` from `@/components/sections/FAQ` and render `<FAQ locale={locale} />` as a full-width section below the `<ContactForm />` block; do not duplicate the FAQ message keys — the component already reads from `landing.faq.*`

**Checkpoint**: Landing-page FAQ is reused on the Support page with zero content duplication.

---

## Phase 6: User Story 4 — Email Directly as a Fallback (Priority: P2)

**Goal**: Visitors who prefer direct email see a clickable `mailto:` link below the form that opens their default email client pre-addressed to the support address.

**Independent Test**: Load `/support`, locate the "or email us directly at:" line below the ContactForm, click the displayed email address — the device's default email client opens with the `To` field pre-filled.

- [x] T018 [US4] In `/Users/fadyfouad/Downloads/Projects/arabsyntax-web/app/[locale]/support/page.tsx`, add a small section directly below `<ContactForm />` (above the FAQ) rendering `support.directEmail.label` followed by `<a href={'mailto:' + process.env.SUPPORT_EMAIL}>` styled with `text-primary underline`; the fallback email text is the raw address so it is readable even if JavaScript is disabled

**Checkpoint**: All four user stories complete. Feature is ready for the verification pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification against `quickstart.md`, accessibility, RTL hygiene, production build. Run in any order; most are independent.

- [x] T019 [P] Run the RTL physical-property grep check from `quickstart.md` Check 8 against `components/forms/ContactForm.tsx` and `app/[locale]/support/` — expect zero matches for `pl-|pr-|ml-|mr-| left-| right-|text-left|text-right|border-l-|border-r-`
- [x] T020 [P] Run `npm run build` from the repo root — expect no TypeScript errors and routes `/[locale]/support` in the output table
- [x] T021 [P] Manually execute `quickstart.md` Checks 1–11 (both locales, empty submit, invalid email, successful submission, honeypot silent block, rate-limit manually if Upstash set, email-failure path, keyboard nav, screen-reader landmarks, mailto fallback) and mark any failing items on a scratch list
- [x] T022 Update memory file `/Users/fadyfouad/.claude/projects/-Users-fadyfouad/memory/project_arabsyntax_progress.md` to mark Feature 004 complete and note any launch-blockers (e.g., Resend domain still needs verification before production)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies — start immediately.
- **Phase 2 Foundational**: Depends on Phase 1 — blocks all user story phases.
- **Phase 3 US1 (P1 MVP)**: Depends on Phase 2.
- **Phase 4 US2 (P1)**: Depends on Phase 3 (T014–T016 edit the same `ContactForm.tsx` created in T009).
- **Phase 5 US3 (P2)**: Depends on Phase 3 (T017 edits `app/[locale]/support/page.tsx` created in T012).
- **Phase 6 US4 (P2)**: Depends on Phase 3 (T018 edits `app/[locale]/support/page.tsx` created in T012).
- **Phase 7 Polish**: Depends on Phases 3–6.

### Task-level Dependencies

- **T008** depends on **T005, T006, T007** (Server Action imports all three utilities).
- **T009** depends on **T008** (ContactForm calls `submitContact`) and **T005** (shares `ContactFormData` type and `contactSchema` for the resolver).
- **T010, T011, T014, T015, T016** all edit the same `ContactForm.tsx` → must run sequentially after **T009**.
- **T012** depends on **T009** (imports `ContactForm`) and on the `support.*` message keys from **T003, T004**.
- **T017, T018** both edit `app/[locale]/support/page.tsx` → must run sequentially after **T012**.

### Parallel Opportunities

- **T003, T004** can run in parallel (different message files).
- **T005, T006, T007** can run in parallel (different lib files, no cross-imports).
- **T019, T020, T021** (polish checks) can run in parallel — none edit code.

---

## Parallel Example: Phase 2 Foundational

```bash
# Launch all three lib utilities in parallel (no cross-dependencies):
Task: "Create zod schema at lib/validation/contact.ts"
Task: "Create Resend wrapper at lib/email/resend.ts"
Task: "Create rate limiter at lib/ratelimit.ts"
# Then run T008 sequentially — it imports all three above.
```

## Parallel Example: Phase 1 Setup

```bash
# T003 and T004 touch different JSON files — safe to parallelize:
Task: "Add support.* namespace to messages/ar.json"
Task: "Add support.* namespace to messages/en.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup (T001–T004).
2. Phase 2 Foundational (T005–T008).
3. Phase 3 US1 (T009–T013).
4. **STOP and VALIDATE**: Submit valid data → email arrives, inline success. Verify the form compiles and the page loads in both locales.
5. At this point the form technically works for the happy path and for generic error messages. You could ship it — but real visitors will hit the validation gaps, so continue to US2 before launch.

### Incremental Delivery

1. **Setup + Foundational** → infrastructure ready.
2. **+ US1** → form submits and delivers email with generic error handling (MVP demo).
3. **+ US2** → per-field validation, honeypot, rate-limit messaging (production-ready).
4. **+ US3** → FAQ reused on Support page.
5. **+ US4** → direct email fallback link.
6. **Polish** → run `quickstart.md` checks and ship.

### Notes on Story Splits

- **US1 and US2 share `ContactForm.tsx`**: US1 creates the file with the submit flow and generic error banner; US2 layers on per-field errors, the honeypot, and the rate-limit-specific error message. This split keeps each story independently shippable at the cost of a few sequential edits to the same file.
- **US3 and US4 are both tiny page edits**: each adds one JSX section to `app/[locale]/support/page.tsx`. Either can ship immediately after US1 regardless of US2 status.

---

## Notes

- `[P]` tasks touch different files and have no ordering dependency.
- All user story phases must remain independently testable — do not introduce cross-story dependencies beyond what's already documented above.
- Every user-visible string must be sourced from the `support.*` namespace — no hardcoded strings per constitution §I.
- All Tailwind classes in `ContactForm.tsx` and `app/[locale]/support/page.tsx` must use logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`, `text-start`, `text-end`) per constitution §IV.
- The honeypot field must be positioned offscreen via `absolute -top-96 opacity-0 pointer-events-none` — NEVER `display:none` (bots often skip hidden fields, but not offscreen ones).
- Vercel KV is forbidden — deployment target is Netlify. Rate limiting uses Upstash Redis via HTTP REST only.
- Commit after each task or each logical checkpoint (typically one commit per user story phase).
