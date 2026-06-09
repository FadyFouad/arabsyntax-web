import { Resend } from 'resend';
import { siteConfig } from '@/lib/siteConfig';
import { getContactEmailConfig } from '@/lib/supportConfig';

type ServerEnrichedSubmission = {
  name: string;
  email: string;
  subject: string;
  message: string;
  locale: 'ar' | 'en';
  ip: string;
  timestamp: string;
};

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character]);
}

function normalizeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export async function sendContactEmail(
  submission: ServerEnrichedSubmission
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { apiKey, fromEmail, supportEmail } = getContactEmailConfig();

    if (!apiKey) {
      return { ok: false, error: 'RESEND_API_KEY environment variable is missing' };
    }

    const resend = new Resend(apiKey);
    const safeSubmission = {
      name: escapeHtml(submission.name),
      email: escapeHtml(submission.email),
      subject: escapeHtml(submission.subject),
      message: escapeHtml(submission.message),
      locale: escapeHtml(submission.locale),
      ip: escapeHtml(submission.ip),
      timestamp: escapeHtml(submission.timestamp),
    };

    const { error } = await resend.emails.send({
      from: `${siteConfig.name.en} Support <${fromEmail}>`,
      to: supportEmail,
      replyTo: submission.email,
      subject: `[${siteConfig.name.en} Support] ${normalizeHeaderValue(submission.subject)}`,
      html: `
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
          <tr><th>Name</th><td>${safeSubmission.name}</td></tr>
          <tr><th>Email</th><td><a href="mailto:${safeSubmission.email}">${safeSubmission.email}</a></td></tr>
          <tr><th>Subject</th><td>${safeSubmission.subject}</td></tr>
          <tr><th>Message</th><td style="white-space:pre-wrap">${safeSubmission.message}</td></tr>
          <tr><th>Locale</th><td>${safeSubmission.locale}</td></tr>
          <tr><th>Submitted</th><td>${safeSubmission.timestamp}</td></tr>
          <tr><th>IP</th><td>${safeSubmission.ip}</td></tr>
        </table>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    console.error('Email send failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
