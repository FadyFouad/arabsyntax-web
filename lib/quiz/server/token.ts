import 'server-only';
import type { TokenItem } from '../types';

/**
 * Stateless, tamper-proof quiz token. GET embeds one in its response; submit
 * sends it back so the server can grade without any stored session. The payload
 * carries only the question ids and the per-question option permutation — NEVER
 * the correct answers, which stay in the server-side bank. HMAC-SHA256 signing
 * stops a client forging or editing the item list; a short TTL bounds reuse.
 *
 * Format: `base64url(payload).base64url(hmac)`.
 */

const TTL_MS = 60 * 60 * 1000; // 1 hour
const encoder = new TextEncoder();

function secret(): string {
  const s = process.env.QUIZ_TOKEN_SECRET;
  if (s) return s;
  // Dev fallback so local runs work without configuring a secret. Production
  // MUST set QUIZ_TOKEN_SECRET (a leaked token can't reveal answers regardless,
  // but a stable real secret prevents cross-deploy token forgery).
  if (process.env.NODE_ENV === 'production') {
    console.warn('[quiz] QUIZ_TOKEN_SECRET is not set — using an insecure fallback.');
  }
  return 'arabsyntax-dev-quiz-secret';
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  return Buffer.from(bytes as ArrayBuffer).toString('base64url');
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return b64url(sig);
}

/** Constant-time string equality (avoids leaking the signature via timing). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface Payload {
  v: 1;
  iat: number;
  items: TokenItem[];
}

export async function signToken(items: TokenItem[], now: number = Date.now()): Promise<string> {
  const payload: Payload = { v: 1, iat: now, items };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = await sign(body);
  return `${body}.${sig}`;
}

/** Verify signature + freshness and return the items, or null if invalid/expired. */
export async function verifyToken(token: string, now: number = Date.now()): Promise<TokenItem[] | null> {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await sign(body);
  if (!safeEqual(sig, expected)) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload?.v !== 1 || !Array.isArray(payload.items)) return null;
  if (typeof payload.iat !== 'number' || now - payload.iat > TTL_MS || payload.iat > now) return null;

  return payload.items;
}
