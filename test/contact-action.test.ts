import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// submitContact() is the ONLY mutating server surface in the whole app (there is
// no DB, no auth, no payments). Every spam submission, every failed delivery,
// every rate-limit bypass flows through here, so it is the single highest-risk
// unit in the codebase. These tests pin the control flow and its short-circuits.
//
// Collaborators are mocked at the module boundary so we exercise the action's
// ORCHESTRATION (order of checks, which result maps to which error) without a
// network, Redis, or Resend. pickClientIp() is left real — it is pure.
// ─────────────────────────────────────────────────────────────────────────────

// Fake request headers object (only .get() is used by the action via pickClientIp).
const headerStore = new Map<string, string>([['cf-connecting-ip', '203.0.113.50']]);
vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve({ get: (k: string) => headerStore.get(k.toLowerCase()) ?? null }),
}));

// Locale is read for the email payload; default to 'ar'.
const getLocale = vi.fn(() => Promise.resolve('ar'));
vi.mock('next-intl/server', () => ({ getLocale: () => getLocale() }));

const checkRateLimit = vi.fn();
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: (ip: string) => checkRateLimit(ip) }));

const sendContactEmail = vi.fn();
vi.mock('@/lib/email/resend', () => ({
  sendContactEmail: (s: unknown) => sendContactEmail(s),
}));

const { submitContact } = await import('@/app/actions/contact');

const VALID = {
  name: 'Sara Ahmed',
  email: 'sara@example.com',
  subject: 'Question about lessons',
  message: 'I would like to know more about the audio lessons offered.',
  website: '', // honeypot left empty by real users
};

beforeEach(() => {
  checkRateLimit.mockReset();
  sendContactEmail.mockReset();
  getLocale.mockClear();
  // Default happy collaborators; individual tests override as needed.
  checkRateLimit.mockResolvedValue({ success: true });
  sendContactEmail.mockResolvedValue({ ok: true });
});

describe('submitContact — happy path', () => {
  it('validates, rate-limits, sends, and returns success', async () => {
    const res = await submitContact(VALID);
    expect(res).toEqual({ success: true });
    expect(checkRateLimit).toHaveBeenCalledWith('203.0.113.50');
    // The email is enriched with server-derived fields the client never supplies.
    expect(sendContactEmail).toHaveBeenCalledTimes(1);
    const payload = sendContactEmail.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: VALID.name,
      email: VALID.email,
      subject: VALID.subject,
      message: VALID.message,
      locale: 'ar',
      ip: '203.0.113.50',
    });
    expect(typeof payload.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(payload.timestamp))).toBe(false);
  });
});

describe('submitContact — validation gate (runs first, before any side effect)', () => {
  it('rejects invalid input with validation_error and performs NO side effects', async () => {
    const res = await submitContact({ ...VALID, email: 'not-an-email' });
    expect(res).toEqual({ success: false, error: 'validation_error' });
    // Critical: a failed validation must never hit the rate limiter or mailer.
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it('rejects a too-short message even when every other field is valid', async () => {
    const res = await submitContact({ ...VALID, message: 'short' });
    expect(res).toEqual({ success: false, error: 'validation_error' });
  });

  it('rejects extra/oversized fields (defense against crafted payloads)', async () => {
    const res = await submitContact({ ...VALID, name: 'x'.repeat(101) });
    expect(res).toEqual({ success: false, error: 'validation_error' });
  });
});

describe('submitContact — honeypot', () => {
  // NOTE (real finding): the honeypot field `website` is also constrained by the
  // schema (`z.string().max(0)`). So a bot that FILLS it fails validation FIRST
  // and gets `validation_error` — the `if (website) return {success:true}`
  // "silent accept" branch in the action is effectively DEAD CODE. Spam is still
  // blocked (no email), but not silently. This test documents the ACTUAL
  // behavior so a future refactor of the honeypot is a conscious decision.
  it('a filled honeypot is rejected as validation_error (NOT a silent success) and sends nothing', async () => {
    const res = await submitContact({ ...VALID, website: 'http://spam.example' });
    expect(res).toEqual({ success: false, error: 'validation_error' });
    expect(sendContactEmail).not.toHaveBeenCalled();
  });
});

describe('submitContact — rate limiting', () => {
  it('maps a throttled result to rate_limited and does NOT send email', async () => {
    checkRateLimit.mockResolvedValue({ success: false });
    const res = await submitContact(VALID);
    expect(res).toEqual({ success: false, error: 'rate_limited' });
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it('maps an unavailable limiter (fail-closed) to rate_limit_unavailable', async () => {
    checkRateLimit.mockResolvedValue({ success: false, unavailable: true });
    const res = await submitContact(VALID);
    expect(res).toEqual({ success: false, error: 'rate_limit_unavailable' });
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it('runs the rate-limit check BEFORE attempting delivery (order matters)', async () => {
    const order: string[] = [];
    checkRateLimit.mockImplementation(async () => {
      order.push('ratelimit');
      return { success: true };
    });
    sendContactEmail.mockImplementation(async () => {
      order.push('email');
      return { ok: true };
    });
    await submitContact(VALID);
    expect(order).toEqual(['ratelimit', 'email']);
  });
});

describe('submitContact — delivery failure', () => {
  it('maps a failed send to send_failed', async () => {
    sendContactEmail.mockResolvedValue({ ok: false, error: 'resend exploded' });
    const res = await submitContact(VALID);
    expect(res).toEqual({ success: false, error: 'send_failed' });
  });
});

describe('submitContact — locale propagation', () => {
  it('passes the active locale through to the email payload', async () => {
    getLocale.mockResolvedValueOnce('en');
    await submitContact(VALID);
    expect(sendContactEmail.mock.calls[0][0].locale).toBe('en');
  });
});
