# Quickstart & Verification: Support Page with Contact Form

**Feature**: 004-support-page | **Date**: 2026-04-10

---

## Prerequisites

1. Feature 001 (site foundation) and Feature 002 (landing page) are complete.
2. `.env.local` at project root contains:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   SUPPORT_EMAIL=your-email@example.com
   # Upstash optional for local dev:
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
3. `npm run dev` is running.

---

## Check 1: Pages Load in Both Locales

- Open `http://localhost:3000/support` → page renders in Arabic (RTL).
  - `<html dir="rtl" lang="ar">` confirmed.
  - Page `<title>` is in Arabic.
  - Intro text, form labels, and submit button are in Arabic.
- Open `http://localhost:3000/en/support` → page renders in English (LTR).
  - `<html dir="ltr" lang="en">` confirmed.
  - Page title and all text is in English.

**Pass condition**: Both URLs return HTTP 200. No untranslated strings visible.

---

## Check 2: Client Validation — Empty Submit

- On `/support` or `/en/support`, click **Submit** without filling any field.
- **Expected**: All four fields show per-field error messages in the page's language.
  - Arabic: "هذا الحقل مطلوب" (or equivalent for each field).
  - English: "This field is required" (or equivalent).
- No network request is sent (confirmed in DevTools Network tab — no POST).

**Pass condition**: Four visible error messages, no server round-trip.

---

## Check 3: Client Validation — Invalid Email

- Fill Name, Subject, and Message with valid data.
- Enter `notanemail` in the Email field.
- Click **Submit**.
- **Expected**: Only the Email field shows an "invalid email" error. Other fields show no error. No network request sent.

**Pass condition**: Exactly one error on the email field.

---

## Check 4: Successful Submission

- Fill all four fields with valid data:
  - Name: `Test User`
  - Email: *(your own email)*
  - Subject: `Test submission`
  - Message: `This is a test message from the dev environment.`
- Click **Submit**.
- **Expected**:
  - Submit button disables and shows a loading state ("Sending..." or spinner).
  - After 1–3 seconds: the form is replaced by an inline success message in the page's language.
  - The developer's inbox (`SUPPORT_EMAIL`) receives an email with subject `[ArabSyntax Support] Test submission`.
  - The email reply-to is set to the submitted email address.

**Pass condition**: Inline success message shown; email received within 60 seconds.

---

## Check 5: Honeypot — Silent Block

- Open DevTools → Elements panel.
- Locate the hidden `website` input (it is offscreen, not `display:none`).
- Fill all visible fields with valid data.
- Using DevTools console, set the honeypot value:
  ```javascript
  document.querySelector('input[name="website"]').value = 'spam';
  ```
- Submit the form.
- **Expected**: The form shows the success confirmation as if submission succeeded. No email is sent to `SUPPORT_EMAIL`.

**Pass condition**: Fake success shown; no email received.

---

## Check 6: Rate Limiting (requires Upstash or 5 manual submissions)

- Submit the form successfully 5 times (use different messages to pass client validation).
- On the 6th submission attempt:
- **Expected**: The form shows a rate-limit error message in the page's language (e.g., "Too many messages sent. Please try again later."). Form field values remain intact.

*Note*: Without Upstash credentials, the local in-memory fallback always returns `{ success: true }`, so rate limiting is not testable locally without real Upstash credentials.

**Pass condition**: 6th submission is rejected with rate-limit error; form remains filled.

---

## Check 7: Email Failure Handling

- Temporarily set `RESEND_API_KEY=invalid_key` in `.env.local` and restart the dev server.
- Submit the form with valid data.
- **Expected**: A red/error inline message appears above the form ("Something went wrong…"). Form field values remain intact. The submit button re-enables.
- Restore the correct API key and restart.

**Pass condition**: Error message appears; form values preserved; no page reload.

---

## Check 8: RTL Physical-Property Check

```bash
grep -r "pl-\|pr-\|ml-\|mr-\| left-\| right-\|text-left\|text-right\|border-l-\|border-r-" \
  components/forms/ContactForm.tsx \
  app/\[locale\]/support/ \
  --include="*.tsx"
```

**Pass condition**: Zero matches.

---

## Check 9: Keyboard Navigation

- Load `/en/support`.
- Press **Tab** repeatedly:
  - Header links → Skip-to-content → Name input → Email input → Subject input → Message input → Honeypot (skipped by tabIndex=-1) → Submit button.
- Every focused element has a clearly visible focus ring (Tailwind `focus-visible:ring-2 focus-visible:ring-primary`).
- Pressing **Enter** on the submit button submits the form.

**Pass condition**: All visible inputs reachable by keyboard; no focus trap; visible focus rings throughout.

---

## Check 10: Screen Reader Landmarks

- Open `/support` in a screen reader (VoiceOver on Mac: `⌘ F5`; or use axe DevTools browser extension).
- Submit the form with an empty Name field.
- **Expected**: Screen reader announces the error message associated with the Name field (e.g., "Name is required" announced after the field's label).
- Submit successfully.
- **Expected**: Screen reader announces "Message sent!" (or Arabic equivalent) in the `role="status"` region.

**Pass condition**: Field errors announced; success message announced.

---

## Check 11: Production Build

```bash
npm run build
```

**Pass condition**: Build completes with no TypeScript errors. Routes `/[locale]/support` appear in the output table.

---

## Direct Email Fallback

- On `/support`, locate the section below the form labelled "or email us directly at:".
- Click the displayed email address.
- **Expected**: The device's default email client opens with the To field pre-filled with `SUPPORT_EMAIL`.

**Pass condition**: mailto: link is clickable and opens email client with correct address.
