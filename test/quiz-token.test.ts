import { describe, it, expect, afterEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';

// token.ts opens with `import 'server-only'`, which throws outside React.
vi.mock('server-only', () => ({}));

import { signToken, verifyToken } from '@/lib/quiz/server/token';
import type { TokenItem } from '@/lib/quiz/types';

const DEV_SECRET = 'arabsyntax-dev-quiz-secret';
const items: TokenItem[] = [
  { id: 'a', perm: [0, 1, 2] },
  { id: 'b', perm: [2, 0, 1] },
];

/** Forge a validly-signed token from an arbitrary body string (fallback secret). */
function forge(bodyStr: string, secret = DEV_SECRET): string {
  const body = Buffer.from(bodyStr).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('signToken / verifyToken', () => {
  it('round-trips the items', async () => {
    const now = 1_000_000;
    const token = await signToken(items, now);
    expect(await verifyToken(token, now)).toEqual(items);
  });

  it('never embeds the items in readable form... but IS readable as ids+perm only', async () => {
    const token = await signToken(items, 1);
    const body = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
    // The payload carries ids + permutations, never a correct-answer field.
    expect(body.items).toEqual(items);
    expect(JSON.stringify(body)).not.toMatch(/correct/i);
  });

  it('rejects a tampered signature', async () => {
    const token = await signToken(items, 1);
    const bad = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(await verifyToken(bad, 1)).toBeNull();
  });

  it('rejects a malformed token (no dot / leading dot)', async () => {
    expect(await verifyToken('nodot', 1)).toBeNull();
    expect(await verifyToken('.abc', 1)).toBeNull();
  });

  it('rejects an expired or future-dated token', async () => {
    const expired = forge(JSON.stringify({ v: 1, iat: 0, items }));
    expect(await verifyToken(expired, 5 * 60 * 60 * 1000)).toBeNull();
    const future = forge(JSON.stringify({ v: 1, iat: 10_000, items }));
    expect(await verifyToken(future, 1)).toBeNull();
  });

  it('rejects wrong version, non-array items, and non-numeric iat', async () => {
    expect(await verifyToken(forge(JSON.stringify({ v: 2, iat: 1, items })), 1)).toBeNull();
    expect(await verifyToken(forge(JSON.stringify({ v: 1, iat: 1, items: 'x' })), 1)).toBeNull();
    expect(await verifyToken(forge(JSON.stringify({ v: 1, iat: 'x', items })), 1)).toBeNull();
  });

  it('rejects a validly-signed but non-JSON body', async () => {
    expect(await verifyToken(forge('not json at all'), 1)).toBeNull();
  });

  it('uses a configured QUIZ_TOKEN_SECRET when present', async () => {
    vi.stubEnv('QUIZ_TOKEN_SECRET', 'super-secret');
    const token = await signToken(items, 1);
    expect(await verifyToken(token, 1)).toEqual(items);
    // A token signed with the fallback secret must NOT verify now.
    expect(await verifyToken(forge(JSON.stringify({ v: 1, iat: 1, items })), 1)).toBeNull();
  });

  it('warns in production when the secret is missing', async () => {
    vi.stubEnv('QUIZ_TOKEN_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await signToken(items, 1);
    expect(warn).toHaveBeenCalled();
  });
});
