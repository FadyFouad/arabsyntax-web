export const THEME_STORAGE_KEY = 'arabsyntax-theme';

export const THEME_CHOICES = ['system', 'light', 'dark'] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

export type ResolvedTheme = Exclude<ThemeChoice, 'system'>;

export function isThemeChoice(value: string | null): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

export const themeInitScript = `
(() => {
  const storageKey = '${THEME_STORAGE_KEY}';
  const root = document.documentElement;

  function isThemeChoice(value) {
    return value === 'system' || value === 'light' || value === 'dark';
  }

  function getStoredTheme() {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return isThemeChoice(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  }

  function resolveTheme(theme) {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return theme;
  }

  function syncThemeColor() {
    const background = window.getComputedStyle(root).getPropertyValue('--color-background').trim();
    if (!background) return;

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }

    meta.setAttribute('content', background);
  }

  const theme = getStoredTheme();
  const resolvedTheme = resolveTheme(theme);

  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  window.requestAnimationFrame(syncThemeColor);
})();
`;
