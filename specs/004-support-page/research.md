# Research: Support Page with Contact Form

**Feature**: 004-support-page | **Date**: 2026-04-10

---

## Decision 1: Email Delivery — Resend

**Decision**: Use `resend` npm package (official Resend SDK) for transactional email delivery.

**Rationale**: Resend is a REST-based email API, making it compatible with any serverless platform including Netlify. It has a first-class TypeScript SDK, generous free tier (100 emails/day, 3,000/month), and straightforward domain verification. The `from` address requires a verified sender domain in the Resend dashboard.

**Setup**:
1. Install: `npm install resend`
2. Create a Resend account and verify the `arabsyntax.com` domain.
3. Generate an API key and store it in `RESEND_API_KEY` environment variable.
4. Store the developer's destination address in `SUPPORT_EMAIL`.

**Email format**:
- `from`: `"ArabSyntax Support <support@arabsyntax.com>"` (requires domain verification)
- `to`: `process.env.SUPPORT_EMAIL`
- `replyTo`: the visitor's submitted email address (so the developer can reply directly)
- `subject`: `[ArabSyntax Support] ${subject}`
- `html`: Simple HTML table with Name, Email, Subject, Message, Locale, Timestamp

**Local dev**: Set `RESEND_API_KEY` in `.env.local`. Emails will be sent live. Alternatively, use Resend's test API key format for development.

**Alternatives considered**:
- SendGrid — rejected: larger SDK, more complex setup for this scale.
- Nodemailer with SMTP — rejected: requires persistent SMTP credentials; less clean API.
- AWS SES — rejected: more infrastructure to configure for a simple contact form.

---

## Decision 2: Rate Limiting — Upstash Redis (HTTP REST)

**Decision**: Use `@upstash/ratelimit` + `@upstash/redis` for rate limiting. Provide an in-memory Map fallback for local development when Upstash env vars are absent.

**Rationale**: Upstash Redis communicates exclusively via HTTP REST API — no persistent TCP connections are needed. This makes it serverless-compatible and works on Netlify functions exactly the same as on Vercel. Vercel KV is explicitly forbidden because deployment is Netlify.

**Rate limit policy**: 5 successful submissions per hour per IP address (sliding window algorithm).

**IP detection**: Extract from `x-forwarded-for` header via `headers()` from `next/headers`. Fall back to `'127.0.0.1'` for local dev when the header is absent.

**Local dev fallback**: When `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are not set, `lib/ratelimit.ts` exports a no-op rate limiter (always returns `{ success: true }`) so local development works without Upstash credentials. This is acceptable because local dev is not exposed to the public internet.

**Setup**:
1. Install: `npm install @upstash/ratelimit @upstash/redis`
2. Create a free Upstash Redis database.
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Netlify env vars.

**Alternatives considered**:
- Vercel KV — REJECTED: platform-locked to Vercel; deployment is Netlify.
- In-memory rate limiter (permanent) — REJECTED: resets on every cold start in serverless, making it ineffective in production.
- Redis via TCP (Upstash) — REJECTED: TCP connections don't work reliably in serverless environments.

---

## Decision 3: Form Architecture — react-hook-form + zod (hybrid pattern)

**Decision**: Use react-hook-form with a zod resolver for client-side form management. On submit (after client validation passes), call the Server Action directly with the form data object. The Server Action re-validates the same zod schema server-side.

**Rationale**: 
- react-hook-form provides uncontrolled inputs for performance, built-in error state management, and clean integration with zod via `@hookform/resolvers`.
- The shared zod schema (`lib/validation/contact.ts`) is the single source of truth for validation rules, imported by both the client component and the server action.
- Calling the Server Action programmatically (not via `<form action={...}>`) allows the client to receive a typed return value `{ success: boolean; error?: string }` and handle success/error state without a page reload.

**Server Action signature** (in `app/actions/contact.ts`):
```typescript
'use server'
export async function submitContact(
  data: ContactFormData
): Promise<{ success: boolean; error?: string }>
```

**Client call pattern** (in ContactForm, inside `handleSubmit`):
```typescript
const result = await submitContact(values);
if (result.success) {
  setStatus('success');
} else {
  setStatus({ error: result.error });
}
```

**Alternatives considered**:
- `useFormState` / `useActionState` with `<form action={...}>` — considered but adds complexity for handling the return value and managing loading state with `useFormStatus`. react-hook-form gives a cleaner API for this form's complexity level.
- Fetch to a Route Handler (`/api/contact`) — REJECTED: Server Actions are preferred per constitution principle IV (avoid API routes when a Server Action suffices).

---

## Decision 4: RTL Form Layout

**Decision**: All form inputs use `className="text-start"` for text alignment. Labels use default (start-aligned). The submit button uses `ms-auto` or `w-full` depending on breakpoint. Error messages are rendered at the end (after inputs) and use `text-error` color.

**Rationale**: When `dir="rtl"` is set on the `<html>` element by the locale layout, all block-level elements and text automatically align to the right. Logical Tailwind properties (`text-start`, `ps-*`, `pe-*`) respond correctly to the `dir` attribute. No special RTL overrides are needed beyond using logical properties throughout.

**Honeypot field**: Rendered with `className="absolute -top-96 opacity-0 pointer-events-none"` to position it offscreen and hide it from sighted users. Using `aria-hidden="true"` and `tabIndex={-1}` ensures screen readers and keyboard users skip it. `display: none` is avoided because some bots skip hidden fields.

---

## Decision 5: FAQ Reuse Strategy

**Decision**: Import the existing `components/sections/FAQ.tsx` component directly on the support page as a standalone section below the contact form.

**Rationale**: The existing FAQ component is a self-contained async Server Component that reads from `landing.faq.*` message keys. The support page reuses the exact same content without any data duplication. The component renders as its own `<section>` with standard spacing, which works well as a full-width section below the contact form rather than in a narrow side column.

**Layout decision**: The support page uses a full-width stacked layout (intro → form → FAQ), not a two-column layout. Putting the FAQ in a side column would require decomposing the FAQ component or passing items as props — adding complexity with minimal UX benefit. A full-width FAQ below the form is simpler and equally readable.

**Trade-off**: The support page FAQ heading/subtitle strings (`landing.faq.heading` and `landing.faq.subtitle`) read correctly in context ("Frequently Asked Questions" / "Answers to the most common questions") — no change needed.

---

## Decision 6: Message Key Structure

**Decision**: Add a `support` namespace to both message files. The full key tree:

```typescript
type SupportMessages = {
  support: {
    title: string;           // Page <h1>
    description: string;     // Intro paragraph
    responseTime: string;    // "We respond within 48 hours"
    directEmail: {
      label: string;         // "Or email us directly at:"
    };
    form: {
      labels: {
        name: string;
        email: string;
        subject: string;
        message: string;
      };
      placeholders: {
        name: string;
        email: string;
        subject: string;
        message: string;
      };
      errors: {
        nameRequired: string;
        nameMin: string;      // "Name must be at least 2 characters"
        emailRequired: string;
        emailInvalid: string;
        subjectRequired: string;
        subjectMin: string;   // "Subject must be at least 3 characters"
        messageRequired: string;
        messageMin: string;   // "Message must be at least 10 characters"
        rateLimited: string;  // "Too many messages. Please try again later."
        sendFailed: string;   // Generic error shown when email fails
      };
      submit: string;         // "Send Message"
      submitting: string;     // "Sending..."
      success: {
        heading: string;      // "Message sent!"
        body: string;         // "We'll get back to you within 48 hours."
        sendAnother: string;  // "Send another message"
      };
    };
  };
};
```

---

## Decision 7: Environment Variables & `.env.example`

**Decision**: Document four environment variables in `.env.example`:

```env
# Required for contact form email delivery
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
SUPPORT_EMAIL=support@arabsyntax.com

# Optional: Upstash Redis for rate limiting (required in production)
UPSTASH_REDIS_REST_URL=https://your-upstash-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

**Local dev**: Only `RESEND_API_KEY` and `SUPPORT_EMAIL` are strictly required to test email submission locally. Without Upstash credentials, the rate limiter falls back to a no-op (always allows submissions).

---

## Decision 8: Zod Schema Field Rules

**Decision**: Zod schema in `lib/validation/contact.ts`:

```typescript
import { z } from 'zod';

export const contactSchema = z.object({
  name:    z.string().min(2).max(100),
  email:   z.string().email().max(254),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  website: z.string().max(0), // honeypot — must be empty
});

export type ContactFormData = z.infer<typeof contactSchema>;
```

**Client validation messages**: Zod's default English messages are not used. Custom messages are provided in the zod schema via `.min(2, { message: 'nameMin' })` etc., passing message keys as the error message string. The client component maps these keys to translations.

**Note**: The `website` field (honeypot) has `max(0)` to enforce emptiness. The server action silently returns success if this field is non-empty, without calling the rate limiter or sending email.
