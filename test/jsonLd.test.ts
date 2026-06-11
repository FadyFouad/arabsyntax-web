import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from '@/lib/jsonLd';

describe('serializeJsonLd', () => {
  it('escapes "<" so a "</script>" sequence cannot break out of the inline script', () => {
    const out = serializeJsonLd({ name: 'pwn</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(out).toContain('\\u003c');
  });

  it('escapes every "<", including "<!--" comment-injection sequences', () => {
    const out = serializeJsonLd({ a: '<!--', b: '<div>' });
    expect(out.match(/</g)).toBeNull();
    expect(out.match(/\\u003c/g)).toHaveLength(2);
  });

  it('stays valid JSON that round-trips back to the original value', () => {
    const value = { '@type': 'Course', name: 'a < b', list: ['x</script>', 1, true, null] };
    const out = serializeJsonLd(value);
    expect(JSON.parse(out)).toEqual(value);
  });

  it('leaves output without "<" untouched aside from normal JSON encoding', () => {
    expect(serializeJsonLd({ ok: 'plain text' })).toBe('{"ok":"plain text"}');
  });
});
