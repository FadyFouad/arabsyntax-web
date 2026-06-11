// Resolve the client IP to rate-limit on, from request headers.
//
// X-Forwarded-For is client-supplied and spoofable: Cloudflare appends the real
// connecting IP to the END of whatever list the visitor sends, so the FIRST
// entry is attacker-controlled — keying on it would let someone rotate fake IPs
// to bypass the limit. Prefer `cf-connecting-ip` (can't be forged); fall back to
// the LAST X-Forwarded-For entry (the one Cloudflare added); then loopback for
// local dev where neither header exists.
type HeaderSource = { get(name: string): string | null };

export function pickClientIp(headers: HeaderSource): string {
  return (
    headers.get('cf-connecting-ip')?.trim() ||
    headers.get('x-forwarded-for')?.split(',').pop()?.trim() ||
    '127.0.0.1'
  );
}
