import { z } from 'zod';

// Visible fields the user actually fills in. Validated on BOTH the client
// (react-hook-form) and the server. The full server payload additionally
// carries `turnstileToken` (see contactSchema below) — that value comes from
// the Turnstile widget, not a typed input, so it is NOT part of this
// client-validated shape.
export const contactFieldsSchema = z.object({
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
  // Honeypot: a hidden field real users never fill. It is accepted (any value)
  // at the schema level on purpose — enforcement lives in the action, which
  // SILENTLY accepts a filled honeypot so a bot can't tell it was caught.
  // (Constraining it here with .max(0) would reject bots with a detectable
  // validation_error and leave the action's silent-block branch unreachable.)
  website: z.string(),
});

// Full submission the server action receives. On top of the visible fields it
// requires a non-empty Turnstile token, which the action verifies against
// Cloudflare siteverify before any side effect (see app/actions/contact.ts).
export const contactSchema = contactFieldsSchema.extend({
  turnstileToken: z.string().min(1),
});

export type ContactFields = z.infer<typeof contactFieldsSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
