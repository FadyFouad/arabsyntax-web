import { describe, it, expect } from 'vitest';
import { pickClientIp } from '@/lib/clientIp';

// Minimal Headers stand-in: case-insensitive get(), like the platform Headers.
function makeHeaders(map: Record<string, string>) {
  const lower = new Map(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

describe('pickClientIp', () => {
  it('prefers cf-connecting-ip (the only unspoofable source)', () => {
    const h = makeHeaders({
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '1.2.3.4, 203.0.113.7',
    });
    expect(pickClientIp(h)).toBe('203.0.113.7');
  });

  it('falls back to the LAST x-forwarded-for entry (the one Cloudflare appends)', () => {
    // First entry is attacker-controlled; the real IP is appended at the end.
    const h = makeHeaders({ 'x-forwarded-for': '6.6.6.6, 1.1.1.1, 198.51.100.9' });
    expect(pickClientIp(h)).toBe('198.51.100.9');
  });

  it('does NOT trust the spoofable first x-forwarded-for entry', () => {
    const h = makeHeaders({ 'x-forwarded-for': '6.6.6.6, 198.51.100.9' });
    expect(pickClientIp(h)).not.toBe('6.6.6.6');
  });

  it('trims surrounding whitespace from the chosen value', () => {
    expect(pickClientIp(makeHeaders({ 'cf-connecting-ip': '  203.0.113.7  ' }))).toBe('203.0.113.7');
    expect(pickClientIp(makeHeaders({ 'x-forwarded-for': '1.1.1.1,   2.2.2.2  ' }))).toBe('2.2.2.2');
  });

  it('falls back to loopback when no IP headers are present (local dev)', () => {
    expect(pickClientIp(makeHeaders({}))).toBe('127.0.0.1');
  });

  it('ignores an empty cf-connecting-ip and uses x-forwarded-for', () => {
    const h = makeHeaders({ 'cf-connecting-ip': '   ', 'x-forwarded-for': '198.51.100.9' });
    expect(pickClientIp(h)).toBe('198.51.100.9');
  });
});
