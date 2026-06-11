import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Upstash SDK so no network/credentials are needed. `limitMock` stands
// in for the per-request rate-limit call and is reconfigured per test.
const limitMock = vi.fn();

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
    limit = limitMock;
  },
}));

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => ({}) },
}));

// ratelimit.ts builds its singleton at import time from env vars, so each
// scenario re-imports the module with the desired environment.
async function loadCheckRateLimit(configured: boolean) {
  vi.resetModules();
  vi.stubEnv('UPSTASH_REDIS_REST_URL', configured ? 'https://example.upstash.io' : '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', configured ? 'token' : '');
  return (await import('@/lib/ratelimit')).checkRateLimit;
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    limitMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows through unthrottled when Upstash is not configured (local dev)', async () => {
    const checkRateLimit = await loadCheckRateLimit(false);
    expect(await checkRateLimit('1.2.3.4')).toEqual({ success: true });
    expect(limitMock).not.toHaveBeenCalled();
  });

  it('allows when configured and under the limit', async () => {
    const checkRateLimit = await loadCheckRateLimit(true);
    limitMock.mockResolvedValue({ success: true });
    expect(await checkRateLimit('1.2.3.4')).toEqual({ success: true });
    expect(limitMock).toHaveBeenCalledWith('contact:1.2.3.4');
  });

  it('rejects (not unavailable) when over the limit', async () => {
    const checkRateLimit = await loadCheckRateLimit(true);
    limitMock.mockResolvedValue({ success: false });
    const result = await checkRateLimit('1.2.3.4');
    expect(result.success).toBe(false);
    expect(result.unavailable).toBeUndefined();
  });

  it('FAILS CLOSED when the Upstash call throws: reject and flag unavailable', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const checkRateLimit = await loadCheckRateLimit(true);
    limitMock.mockRejectedValue(new Error('redis down'));
    expect(await checkRateLimit('1.2.3.4')).toEqual({ success: false, unavailable: true });
    errSpy.mockRestore();
  });
});
