import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { siteConfig } from '@/lib/siteConfig';

// getContactEmailConfig() decides WHERE contact-form mail goes and WHO it comes
// from. A misconfigured env var here means either failed delivery or mail
// silently routed to the wrong inbox — so the safe-fallback behavior is tested.

async function loadConfig() {
  vi.resetModules();
  return import('@/lib/supportConfig');
}

beforeEach(() => {
  vi.stubEnv('RESEND_API_KEY', '');
  vi.stubEnv('RESEND_FROM_EMAIL', '');
  vi.stubEnv('SUPPORT_EMAIL', '');
});

afterEach(() => vi.unstubAllEnvs());

describe('getSupportEmail', () => {
  it('uses SUPPORT_EMAIL when set', async () => {
    vi.stubEnv('SUPPORT_EMAIL', 'desk@alnahwalkafi.com');
    const { getSupportEmail } = await loadConfig();
    expect(getSupportEmail()).toBe('desk@alnahwalkafi.com');
  });

  it('falls back to the public domain support address (never a personal inbox)', async () => {
    const { getSupportEmail } = await loadConfig();
    expect(getSupportEmail()).toBe(siteConfig.supportEmail);
    expect(getSupportEmail()).not.toMatch(/gmail|hotmail|yahoo/i);
  });
});

describe('getResendFromEmail', () => {
  it('uses RESEND_FROM_EMAIL when set, without warning', async () => {
    vi.stubEnv('RESEND_FROM_EMAIL', 'noreply@alnahwalkafi.com');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getResendFromEmail } = await loadConfig();
    expect(getResendFromEmail()).toBe('noreply@alnahwalkafi.com');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('WARNS and falls back when RESEND_FROM_EMAIL is missing (visible misconfig)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getResendFromEmail } = await loadConfig();
    expect(getResendFromEmail()).toBe(siteConfig.supportEmail);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

describe('getContactEmailConfig', () => {
  it('surfaces a missing API key as falsy so the mailer fails fast (if (!apiKey))', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getContactEmailConfig } = await loadConfig();
    expect(getContactEmailConfig().apiKey).toBeFalsy();
    warn.mockRestore();
  });

  it('threads all three resolved values together', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key_123');
    vi.stubEnv('RESEND_FROM_EMAIL', 'from@alnahwalkafi.com');
    vi.stubEnv('SUPPORT_EMAIL', 'to@alnahwalkafi.com');
    const { getContactEmailConfig } = await loadConfig();
    expect(getContactEmailConfig()).toEqual({
      apiKey: 'key_123',
      fromEmail: 'from@alnahwalkafi.com',
      supportEmail: 'to@alnahwalkafi.com',
    });
  });
});
