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
  website: z.string().max(0),
});

export type ContactFormData = z.infer<typeof contactSchema>;