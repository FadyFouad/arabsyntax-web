import { describe, it, expect, vi, beforeEach } from 'vitest';

import { siteConfig } from '@/lib/siteConfig';

// ─────────────────────────────────────────────────────────────────────────────
// /go/:platform is the app-download tracking endpoint: it records one Analytics
// Engine data point, then 302s to the store. These tests pin the two guarantees
// that matter:
//   1. A click is ALWAYS counted before the redirect is returned (the write is a
//      synchronous, fire-and-forget enqueue — there is nothing to await).
//   2. Analytics is BEST-EFFORT: a throwing write, or a missing binding, must
//      never block the user's redirect or surface an error.
// The Cloudflare context is mocked at the module boundary so we exercise the
// handler's control flow without a real worker runtime.
// ─────────────────────────────────────────────────────────────────────────────

const writeDataPoint = vi.fn();
const getCloudflareContext = vi.fn();

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => getCloudflareContext(),
}));

const { GET } = await import('@/app/go/[platform]/route');

// Default: a healthy context with the APP_DOWNLOADS binding and a country.
function healthyContext() {
  return Promise.resolve({
    env: { APP_DOWNLOADS: { writeDataPoint } },
    cf: { country: 'EG' },
  });
}

const call = (platform: string, query = '') =>
  GET(new Request(`https://alnahwalkafi.com/go/${platform}${query}`), {
    params: Promise.resolve({ platform }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  getCloudflareContext.mockImplementation(healthyContext);
});

describe('/go/:platform — successful writes are recorded', () => {
  it('records the click and 302s to the App Store (ios)', async () => {
    const res = await call('ios', '?l=en&s=hero');

    // Redirect is correct...
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(siteConfig.stores.appStore);
    expect(res.headers.get('cache-control')).toBe('no-store');

    // ...and exactly one data point was written, BEFORE the response resolved.
    expect(writeDataPoint).toHaveBeenCalledTimes(1);
    expect(writeDataPoint).toHaveBeenCalledWith({
      indexes: ['ios'],
      blobs: ['ios', 'en', 'EG', 'hero'],
      doubles: [1],
    });
  });

  it('records android with ar locale and defaulted source', async () => {
    const res = await call('android'); // no query string

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(siteConfig.stores.googlePlay);
    expect(writeDataPoint).toHaveBeenCalledWith({
      indexes: ['android'],
      blobs: ['android', 'ar', 'EG', 'unknown'],
      doubles: [1],
    });
  });

  it('caps an over-long source to 32 chars', async () => {
    await call('ios', `?s=${'x'.repeat(100)}`);
    const { blobs } = writeDataPoint.mock.calls[0][0];
    expect(blobs[3]).toHaveLength(32);
  });
});

describe('/go/:platform — analytics is best-effort, never blocks the redirect', () => {
  it('still redirects when writeDataPoint throws', async () => {
    writeDataPoint.mockImplementation(() => {
      throw new Error('Analytics Engine unavailable');
    });

    const res = await call('ios', '?l=en');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(siteConfig.stores.appStore);
    expect(writeDataPoint).toHaveBeenCalledTimes(1); // attempted, then swallowed
  });

  it('still redirects when the APP_DOWNLOADS binding is missing (e.g. next dev)', async () => {
    getCloudflareContext.mockResolvedValue({ env: {}, cf: { country: 'EG' } });

    const res = await call('android', '?l=ar');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(siteConfig.stores.googlePlay);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });

  it('still redirects when the Cloudflare context itself is unavailable', async () => {
    getCloudflareContext.mockRejectedValue(new Error('no context'));

    const res = await call('ios');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(siteConfig.stores.appStore);
  });
});

describe('/go/:platform — input validation', () => {
  it('404s an unknown platform and writes nothing (no open redirect)', async () => {
    const res = await call('windows');

    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
    expect(writeDataPoint).not.toHaveBeenCalled();
  });
});
