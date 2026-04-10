# Data Model: Support Page with Contact Form

**Feature**: 004-support-page | **Date**: 2026-04-10

No database entities. Contact submissions are delivered by email and discarded.
Rate-limit state is stored transiently in Upstash Redis.

---

## Zod Schema: `contactSchema`

Lives in `lib/validation/contact.ts`. Imported by both the client component and the Server Action.

```typescript
import { z } from 'zod';

export const contactSchema = z.object({
  name:    z.string().min(2, { message: 'nameMin' }).max(100),
  email:   z.string().min(1, { message: 'emailRequired' }).email({ message: 'emailInvalid' }).max(254),
  subject: z.string().min(3, { message: 'subjectMin' }).max(200),
  message: z.string().min(10, { message: 'messageMin' }).max(5000),
  website: z.string().max(0), // honeypot — must be empty; validated server-side only
});

export type ContactFormData = z.infer<typeof contactSchema>;
```

**Error message keys**: Each `.min()` and `.email()` call uses a short key string (e.g., `'nameMin'`). The client component maps these keys to the full translated string from `support.form.errors.*`. Required-field errors (when the field is empty) are mapped from `'nameMin'` → check if field is empty and show `nameRequired` instead, OR use separate `.min(1, { message: 'nameRequired' })` on each field before the length check.

**Revised schema with required-field discrimination**:
```typescript
export const contactSchema = z.object({
  name: z.string()
    .min(1, { message: 'nameRequired' })
    .min(2, { message: 'nameMin' })
    .max(100),
  email: z.string()
    .min(1, { message: 'emailRequired' })
    .email({ message: 'emailInvalid' })
    .max(254),
  subject: z.string()
    .min(1, { message: 'subjectRequired' })
    .min(3, { message: 'subjectMin' })
    .max(200),
  message: z.string()
    .min(1, { message: 'messageRequired' })
    .min(10, { message: 'messageMin' })
    .max(5000),
  website: z.string().max(0),
});
```

---

## Contact Submission: Runtime Shape

Not persisted. Passed from client to Server Action, validated, and forwarded to Resend.

```typescript
type ContactSubmission = {
  name:    string;   // 2–100 chars
  email:   string;   // valid email, ≤ 254 chars
  subject: string;   // 3–200 chars
  message: string;   // 10–5000 chars
  website: string;   // honeypot — must be empty string
};
```

Additional fields added by the Server Action (not from the client):
```typescript
type ServerEnrichedSubmission = ContactSubmission & {
  locale:    'ar' | 'en';        // inferred from Next.js locale context
  ip:        string;             // from x-forwarded-for header
  timestamp: string;             // ISO 8601 at submission time
};
```

---

## Server Action Return Type

```typescript
type ContactActionResult =
  | { success: true }
  | { success: false; error: 'rate_limited' | 'send_failed' | 'validation_error' };
```

The client maps `error` values to translated strings in `support.form.errors.*`.

---

## Rate Limit Record (Upstash Redis)

Managed transparently by `@upstash/ratelimit`. Key format: `contact:{ip}`.
Window: 1 hour sliding. Limit: 5 requests.

```typescript
// Key stored in Redis:
// "ratelimit:contact:1.2.3.4" → sliding window counter
```

---

## Message Key Tree: `support.*`

Full structure added to `messages/ar.json` and `messages/en.json`:

```json
"support": {
  "title": "...",
  "description": "...",
  "responseTime": "...",
  "directEmail": {
    "label": "..."
  },
  "form": {
    "labels": {
      "name": "...",
      "email": "...",
      "subject": "...",
      "message": "..."
    },
    "placeholders": {
      "name": "...",
      "email": "...",
      "subject": "...",
      "message": "..."
    },
    "errors": {
      "nameRequired": "...",
      "nameMin": "...",
      "emailRequired": "...",
      "emailInvalid": "...",
      "subjectRequired": "...",
      "subjectMin": "...",
      "messageRequired": "...",
      "messageMin": "...",
      "rateLimited": "...",
      "sendFailed": "..."
    },
    "submit": "...",
    "submitting": "...",
    "success": {
      "heading": "...",
      "body": "...",
      "sendAnother": "..."
    }
  }
}
```

---

## Component Interfaces

### SupportPage (Server Component)

```typescript
// app/[locale]/support/page.tsx
// No props — params is awaited internally
// Renders: intro section, ContactForm, FAQ section
// Exports: generateMetadata
```

### ContactForm (Client Component)

```typescript
// components/forms/ContactForm.tsx
// 'use client'
// No props — uses useTranslations('support.form') internally
// Uses: useForm<ContactFormData>, contactSchema, submitContact action
// State: 'idle' | 'submitting' | 'success' | { error: string }
```

### Server Action: submitContact

```typescript
// app/actions/contact.ts
// 'use server'
export async function submitContact(
  data: ContactFormData
): Promise<ContactActionResult>
```

### Resend Wrapper

```typescript
// lib/email/resend.ts
export async function sendContactEmail(
  submission: ServerEnrichedSubmission
): Promise<{ ok: boolean; error?: string }>
```

### Rate Limiter

```typescript
// lib/ratelimit.ts
export async function checkRateLimit(
  ip: string
): Promise<{ success: boolean }>
```

---

## New Source Files

```text
# Install
zod
react-hook-form @hookform/resolvers
resend
@upstash/ratelimit @upstash/redis

# Config
.env.example                        ← document required + optional env vars

# Page
app/[locale]/support/page.tsx

# Component
components/forms/ContactForm.tsx

# Action
app/actions/contact.ts

# Utilities
lib/validation/contact.ts
lib/email/resend.ts
lib/ratelimit.ts

# Messages
messages/ar.json                    ← add support.* namespace
messages/en.json                    ← add support.* namespace
```

---

## Email HTML Format

Sent by `lib/email/resend.ts` via Resend SDK:

```html
<table>
  <tr><th>Name</th><td>{name}</td></tr>
  <tr><th>Email</th><td><a href="mailto:{email}">{email}</a></td></tr>
  <tr><th>Subject</th><td>{subject}</td></tr>
  <tr><th>Message</th><td style="white-space:pre-wrap">{message}</td></tr>
  <tr><th>Locale</th><td>{locale}</td></tr>
  <tr><th>Submitted</th><td>{timestamp}</td></tr>
  <tr><th>IP</th><td>{ip}</td></tr>
</table>
```
