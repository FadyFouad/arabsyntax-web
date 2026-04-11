import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type ServerEnrichedSubmission = {
  name: string;
  email: string;
  subject: string;
  message: string;
  locale: 'ar' | 'en';
  ip: string;
  timestamp: string;
};

export async function sendContactEmail(
  submission: ServerEnrichedSubmission
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supportEmail = process.env.SUPPORT_EMAIL;
    if (!supportEmail) {
      throw new Error('SUPPORT_EMAIL environment variable is missing');
    }

    const { data, error } = await resend.emails.send({
      from: "ArabSyntax Support <support@arabsyntax.com>",
      to: supportEmail,
      replyTo: submission.email,
      subject: `[ArabSyntax Support] ${submission.subject}`,
      html: `
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
          <tr><th>Name</th><td>${submission.name}</td></tr>
          <tr><th>Email</th><td><a href="mailto:${submission.email}">${submission.email}</a></td></tr>
          <tr><th>Subject</th><td>${submission.subject}</td></tr>
          <tr><th>Message</th><td style="white-space:pre-wrap">${submission.message}</td></tr>
          <tr><th>Locale</th><td>${submission.locale}</td></tr>
          <tr><th>Submitted</th><td>${submission.timestamp}</td></tr>
          <tr><th>IP</th><td>${submission.ip}</td></tr>
        </table>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Email send failed:', err);
    return { ok: false, error: err.message };
  }
}