import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// sendContactEmail() builds an HTML email from user-controlled strings and sets
// mail headers (replyTo, subject) from them too. Two real attack classes here:
//   1. Stored XSS in the support inbox — a <script>/<img onerror> in any field
//      must be HTML-escaped before it lands in the email body.
//   2. Email header injection — a CRLF in the email/subject must be stripped so
//      an attacker can't forge Bcc/extra headers in the outgoing message.
// We mock the Resend SDK so we can inspect the exact payload it would send.
// ─────────────────────────────────────────────────────────────────────────────

const sendMock = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (args: unknown) => sendMock(args) };
    constructor(public key: string) {}
  },
}));

const { sendContactEmail } = await import('@/lib/email/resend');

const SUB = {
  name: 'Sara',
  email: 'sara@example.com',
  subject: 'Hello',
  message: 'A normal message body.',
  locale: 'ar' as const,
  ip: '203.0.113.9',
  timestamp: '2026-06-11T10:00:00.000Z',
};

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: 'abc' }, error: null });
  vi.stubEnv('RESEND_API_KEY', 'test-key');
  vi.stubEnv('RESEND_FROM_EMAIL', 'support@alnahwalkafi.com');
  vi.stubEnv('SUPPORT_EMAIL', 'support@alnahwalkafi.com');
});

describe('sendContactEmail — happy path', () => {
  it('returns ok and sends with replyTo set to the user email', async () => {
    const res = await sendContactEmail(SUB);
    expect(res).toEqual({ ok: true });
    const payload = sendMock.mock.calls[0][0];
    expect(payload.to).toBe('support@alnahwalkafi.com');
    expect(payload.replyTo).toBe('sara@example.com');
    expect(payload.subject).toContain('Hello');
    expect(payload.html).toContain('A normal message body.');
  });
});

describe('sendContactEmail — XSS escaping (stored XSS into the support inbox)', () => {
  it('escapes <script> in every rendered field so no live markup reaches the body', async () => {
    await sendContactEmail({
      ...SUB,
      name: '<script>alert(1)</script>',
      subject: '<img src=x onerror=alert(2)>',
      message: '<b>bold</b> & "quotes" \'apos\'',
    });
    const html = sendMock.mock.calls[0][0].html as string;
    // No raw tag delimiters from user content survive — so the payload can never
    // form a live element, even though inert attribute *text* like "onerror=" may
    // remain harmlessly between escaped angle brackets.
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    // They are present in escaped form instead.
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
    expect(html).toContain('&#39;');
  });

  it('escapes a payload crafted to break out of the mailto href attribute', async () => {
    await sendContactEmail({ ...SUB, email: 'a@b.com"><script>alert(1)</script>' });
    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).not.toContain('"><script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });
});

describe('sendContactEmail — email header injection (CRLF)', () => {
  it('collapses CRLF in the reply-to address so no extra headers can be forged', async () => {
    await sendContactEmail({ ...SUB, email: 'attacker@evil.com\r\nBcc: victim@x.com' });
    const replyTo = sendMock.mock.calls[0][0].replyTo as string;
    expect(replyTo).not.toMatch(/[\r\n]/);
    expect(replyTo).toBe('attacker@evil.com Bcc: victim@x.com');
  });

  it('collapses CRLF in the subject line', async () => {
    await sendContactEmail({ ...SUB, subject: 'Hi\r\nContent-Type: text/html' });
    const subject = sendMock.mock.calls[0][0].subject as string;
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

describe('sendContactEmail — misconfiguration & failure handling', () => {
  it('fails fast (no SDK call) when RESEND_API_KEY is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const res = await sendContactEmail(SUB);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/RESEND_API_KEY/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns ok:false (not a throw) when Resend reports an error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendMock.mockResolvedValue({ data: null, error: { message: 'domain not verified' } });
    const res = await sendContactEmail(SUB);
    expect(res).toEqual({ ok: false, error: 'domain not verified' });
    errSpy.mockRestore();
  });

  it('catches a thrown SDK error and degrades to ok:false', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendMock.mockRejectedValue(new Error('network down'));
    const res = await sendContactEmail(SUB);
    expect(res).toEqual({ ok: false, error: 'network down' });
    errSpy.mockRestore();
  });

  it('does not leak the message body into console logs on failure', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendMock.mockResolvedValue({ data: null, error: { message: 'rejected' } });
    await sendContactEmail({ ...SUB, message: 'SECRET-PII-CONTENT-12345' });
    const logged = errSpy.mock.calls.flat().join(' ');
    expect(logged).not.toContain('SECRET-PII-CONTENT-12345');
    errSpy.mockRestore();
  });
});
