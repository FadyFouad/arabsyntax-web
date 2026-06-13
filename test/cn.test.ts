import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/cn';

// cn() = clsx (conditional class assembly) + tailwind-merge (conflict resolution).
// It's used on nearly every component, so a regression here is broad but silent.
describe('cn', () => {
  it('joins plain class strings', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy/conditional values (clsx semantics)', () => {
    expect(cn('a', false, null, undefined, 0 as unknown as string, 'b')).toBe('a b');
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('flattens arrays of class values', () => {
    expect(cn(['a', 'b'], ['c'])).toBe('a b c');
  });

  it('lets the last Tailwind utility win on a conflict (tailwind-merge)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('keeps non-conflicting Tailwind utilities side by side', () => {
    expect(cn('px-2 py-1', 'text-sm')).toBe('px-2 py-1 text-sm');
  });

  it('returns an empty string when given nothing', () => {
    expect(cn()).toBe('');
  });
});
