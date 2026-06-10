'use server';

import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { contactSchema, type ContactFormData } from '@/lib/validation/contact';
import { sendContactEmail } from '@/lib/email/resend';
import { checkRateLimit } from '@/lib/ratelimit';

type ContactActionResult =
  | { success: true }
  | { success: false; error: 'rate_limited' | 'rate_limit_unavailable' | 'send_failed' | 'validation_error' };

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
  // Use Cloudflare's trusted connecting-IP. X-Forwarded-For is client-supplied:
  // Cloudflare appends the real IP to the END of any list the visitor sends, so
  // the first entry is spoofable — taking it would let an attacker rotate IPs to
  // bypass the rate limit. cf-connecting-ip can't be forged; fall back to the
  // LAST XFF entry (the one Cloudflare added) only if it's absent.
  const ip =
    headersList.get('cf-connecting-ip')?.trim() ||
    headersList.get('x-forwarded-for')?.split(',').pop()?.trim() ||
    '127.0.0.1';

  const rateLimitResult = await checkRateLimit(ip);
  if (!rateLimitResult.success) {
    return {
      success: false,
      error: rateLimitResult.unavailable ? 'rate_limit_unavailable' : 'rate_limited',
    };
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