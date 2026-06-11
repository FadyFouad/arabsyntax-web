import { describe, it, expect } from 'vitest';
import { isThemeChoice, THEME_CHOICES, THEME_STORAGE_KEY, themeInitScript } from '@/lib/theme';

// The theme system reads an attacker-influenceable value (localStorage) and an
// inline boot script runs before React hydrates. isThemeChoice() is the guard
// that stops a tampered/garbage localStorage value from being applied verbatim.

describe('isThemeChoice', () => {
  it('accepts exactly the three valid choices', () => {
    for (const c of THEME_CHOICES) expect(isThemeChoice(c)).toBe(true);
  });

  it.each(['', 'System', 'DARK', 'blue', '"><script>', null, '0', 'undefined'])(
    'rejects invalid / tampered value %j',
    (v) => {
      expect(isThemeChoice(v as string | null)).toBe(false);
    },
  );
});

describe('themeInitScript (inline boot script)', () => {
  it('embeds the storage key it reads from', () => {
    expect(themeInitScript).toContain(THEME_STORAGE_KEY);
  });

  it('wraps localStorage access in try/catch (Safari private mode throws)', () => {
    // A throw here would block first paint entirely, so the guard must exist.
    expect(themeInitScript).toMatch(/try\s*{/);
    expect(themeInitScript).toContain('catch');
  });

  it('does not interpolate any unexpected values that could break out of the <script>', () => {
    // The only interpolation is the storage key; assert no stray "</script>".
    expect(themeInitScript).not.toContain('</script>');
  });
});
