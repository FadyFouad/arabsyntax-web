import { z } from 'zod';

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
  // Honeypot: a hidden field real users never fill. It is accepted (any value)
  // at the schema level on purpose — enforcement lives in the action, which
  // SILENTLY accepts a filled honeypot so a bot can't tell it was caught.
  // (Constraining it here with .max(0) would reject bots with a detectable
  // validation_error and leave the action's silent-block branch unreachable.)
  website: z.string(),
});

export type ContactFormData = z.infer<typeof contactSchema>;