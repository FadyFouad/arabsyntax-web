import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ratelimit.ts opens with `import 'server-only'`, which throws outside React.
vi.mock('server-only', () => ({}));

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
async function loadCheckQuizRateLimit(configured: boolean) {
  vi.resetModules();
  vi.stubEnv('UPSTASH_REDIS_REST_URL', configured ? 'https://example.upstash.io' : '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', configured ? 'token' : '');
  return (await import('@/lib/quiz/server/ratelimit')).checkQuizRateLimit;
}

describe('checkQuizRateLimit', () => {
  beforeEach(() => {
    limitMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows through unthrottled when Upstash is not configured (local dev)', async () => {
    const checkQuizRateLimit = await loadCheckQuizRateLimit(false);
    expect(await checkQuizRateLimit('1.2.3.4', 'submit')).toEqual({ success: true });
    expect(limitMock).not.toHaveBeenCalled();
  });

  it('allows when configured and under the limit', async () => {
    const checkQuizRateLimit = await loadCheckQuizRateLimit(true);
    limitMock.mockResolvedValue({ success: true });
    expect(await checkQuizRateLimit('1.2.3.4', 'submit')).toEqual({ success: true });
    expect(limitMock).toHaveBeenCalledWith('quiz:submit:1.2.3.4');
  });

  it('rejects (not unavailable) when over the limit', async () => {
    const checkQuizRateLimit = await loadCheckQuizRateLimit(true);
    limitMock.mockResolvedValue({ success: false });
    const result = await checkQuizRateLimit('1.2.3.4', 'submit');
    expect(result.success).toBe(false);
    expect(result.unavailable).toBeUndefined();
  });

  it('FAILS CLOSED when the Upstash call throws: reject and flag unavailable', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const checkQuizRateLimit = await loadCheckQuizRateLimit(true);
    limitMock.mockRejectedValue(new Error('redis down'));
    expect(await checkQuizRateLimit('1.2.3.4', 'submit')).toEqual({ success: false, unavailable: true });
    errSpy.mockRestore();
  });
});
