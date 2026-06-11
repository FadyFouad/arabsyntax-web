import { describe, it, expect } from 'vitest';
import { contactSchema } from '@/lib/validation/contact';

// The schema is the trust boundary for the contact action: anything it accepts
// is treated as a real submission and emailed. These tests probe the boundary
// values (min/max lengths), the honeypot, and i18n-relevant content (Arabic,
// unicode, emoji) that a naive ASCII-only validator might mishandle.

const base = {
  name: 'Sara',
  email: 'sara@example.com',
  subject: 'Hello there',
  message: 'This message is definitely long enough to pass.',
  website: '',
};

function parse(overrides: Record<string, unknown>) {
  return contactSchema.safeParse({ ...base, ...overrides });
}

describe('contactSchema — happy path', () => {
  it('accepts a well-formed submission', () => {
    expect(parse({}).success).toBe(true);
  });

  it('accepts Arabic (RTL) names and messages', () => {
    const r = parse({
      name: 'سارة أحمد',
      subject: 'سؤال عن الدروس',
      message: 'أرغب في معرفة المزيد عن الدروس الصوتية المتاحة في التطبيق.',
    });
    expect(r.success).toBe(true);
  });

  it('accepts unicode, emoji, and mixed scripts in free-text fields', () => {
    const r = parse({ name: 'Zoé 山田 🎉', message: 'Great app! شكراً جزيلاً 👍👍👍 thanks' });
    expect(r.success).toBe(true);
  });
});

describe('contactSchema — name bounds', () => {
  it('rejects empty', () => expect(parse({ name: '' }).success).toBe(false));
  it('rejects single char (min 2)', () => expect(parse({ name: 'A' }).success).toBe(false));
  it('accepts exactly 2 chars', () => expect(parse({ name: 'Al' }).success).toBe(true));
  it('accepts exactly 100 chars', () => expect(parse({ name: 'x'.repeat(100) }).success).toBe(true));
  it('rejects 101 chars', () => expect(parse({ name: 'x'.repeat(101) }).success).toBe(false));
  // A single Arabic char is length 1 → rejected, same as Latin. Guards against a
  // surrogate-pair off-by-one (emoji count as 2 UTF-16 units in .length).
  it('rejects a single Arabic letter', () => expect(parse({ name: 'ب' }).success).toBe(false));
});

describe('contactSchema — email', () => {
  it.each([
    'plainaddress',
    '@no-local.com',
    'no-at-sign.com',
    'spaces in@email.com',
    'trailing@dot.',
    '',
  ])('rejects malformed email %j', (email) => {
    expect(parse({ email }).success).toBe(false);
  });

  it('rejects an email over 254 chars even if otherwise shaped like an email', () => {
    const huge = `${'a'.repeat(250)}@b.com`;
    expect(parse({ email: huge }).success).toBe(false);
  });

  it('rejects header-injection attempts in the email field', () => {
    // CRLF would let an attacker forge mail headers downstream; must never validate.
    expect(parse({ email: 'a@b.com\r\nBcc: victim@x.com' }).success).toBe(false);
  });
});

describe('contactSchema — subject & message bounds', () => {
  it('rejects subject under 3 chars', () => expect(parse({ subject: 'ab' }).success).toBe(false));
  it('accepts subject at 200 chars', () => expect(parse({ subject: 'x'.repeat(200) }).success).toBe(true));
  it('rejects subject over 200 chars', () => expect(parse({ subject: 'x'.repeat(201) }).success).toBe(false));
  it('rejects message under 10 chars', () => expect(parse({ message: 'too short' }).success).toBe(false));
  it('accepts message at 5000 chars', () => expect(parse({ message: 'x'.repeat(5000) }).success).toBe(true));
  it('rejects message over 5000 chars (payload-size guard)', () =>
    expect(parse({ message: 'x'.repeat(5001) }).success).toBe(false));
});

describe('contactSchema — honeypot (website)', () => {
  it('accepts an empty honeypot (the value a human submits)', () => {
    expect(parse({ website: '' }).success).toBe(true);
  });
  // The honeypot is intentionally NOT rejected at the schema level: a filled
  // value passes validation and is silently blocked by the action, so a bot
  // can't distinguish the honeypot from a normal success. See
  // contact-action.test.ts for the silent-accept behavior.
  it('accepts a non-empty honeypot at the schema level (the action blocks it)', () => {
    expect(parse({ website: 'http://spam' }).success).toBe(true);
    expect(parse({ website: ' ' }).success).toBe(true);
  });
  it('still requires the honeypot field to be present (a string)', () => {
    const { website, ...withoutHoneypot } = base;
    void website;
    expect(contactSchema.safeParse(withoutHoneypot).success).toBe(false);
  });
});

describe('contactSchema — type coercion guards', () => {
  it.each([
    { name: 123 },
    { name: null },
    { email: undefined },
    { message: { length: 9999 } },
    { subject: ['array'] },
  ])('rejects non-string field %j without coercing it', (override) => {
    expect(parse(override as Record<string, unknown>).success).toBe(false);
  });
});
