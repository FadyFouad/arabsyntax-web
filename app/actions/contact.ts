'use server';

import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { contactSchema, type ContactFormData } from '@/lib/validation/contact';
import { sendContactEmail } from '@/lib/email/resend';
import { checkRateLimit } from '@/lib/ratelimit';

type ContactActionResult =
  | { success: true }
  | { success: false; error: 'rate_limited' | 'send_failed' | 'validation_error' };

export async function submitContact(data: ContactFormData): Promise<ContactActionResult> {
  const result = contactSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: 'validation_error' };
  }

  const { name, email, subject, message, website } = result.data;

  // Honeypot check
  if (website) {
    return { success: true }; // Silently block
  }

  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

  const rateLimitResult = await checkRateLimit(ip);
  if (!rateLimitResult.success) {
    return { success: false, error: 'rate_limited' };
  }

  const locale = (await getLocale()) as 'ar' | 'en';
  const timestamp = new Date().toISOString();

  const emailResult = await sendContactEmail({
    name,
    email,
    subject,
    message,
    locale,
    ip,
    timestamp,
  });

  if (!emailResult.ok) {
    return { success: false, error: 'send_failed' };
  }

  return { success: true };
}