'use server';

import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { contactSchema, type ContactFormData } from '@/lib/validation/contact';
import { sendContactEmail } from '@/lib/email/resend';
import { checkRateLimit } from '@/lib/ratelimit';
import { pickClientIp } from '@/lib/clientIp';

type ContactActionResult =
  | { success: true }
  | { success: false; error: 'rate_limited' | 'rate_limit_unavailable' | 'send_failed' | 'validation_error' | 'turnstile' };

const TURNSTILE_SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Verify a Turnstile token with Cloudflare. Fails CLOSED: a missing secret, a
// network error, or a non-success response all reject the submission rather than
// letting it through unverified.
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set; rejecting submission.');
    return false;
  }
  try {
    const res = await fetch(TURNSTILE_SITEVERIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return false;
  }
}

export async function submitContact(data: ContactFormData): Promise<ContactActionResult> {
  const result = contactSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: 'validation_error' };
  }

  const { name, email, subject, message, website, turnstileToken } = result.data;

  // Honeypot: real users never fill the hidden `website` field. Silently accept
  // (return success without rate-limiting or sending) so a bot can't distinguish
  // being caught from a real submission. Runs before any side effect.
  if (website) {
    return { success: true };
  }

  const headersList = await headers();
  const ip = pickClientIp(headersList);

  // Turnstile: verify the challenge token with Cloudflare. Runs AFTER the
  // honeypot (so a caught bot can't probe siteverify) and BEFORE rate-limit and
  // send. Unlike the honeypot this is NOT a silent accept — a real visitor who
  // fails the challenge gets a normal error so they can retry.
  const turnstilePassed = await verifyTurnstile(turnstileToken, ip);
  if (!turnstilePassed) {
    return { success: false, error: 'turnstile' };
  }

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