'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  isThemeChoice,
  THEME_CHOICES,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeChoice,
} from '@/lib/theme';

const ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

const THEME_CHANGE_EVENT = 'arabsyntax-theme-change';
let volatileTheme: ThemeChoice | null = null;

function getStoredTheme(): ThemeChoice {
  if (typeof window === 'undefined') {
    return 'system';
  }

  if (volatileTheme) {
    return volatileTheme;
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function resolveTheme(theme: ThemeChoice): ResolvedTheme {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return theme;
}

function syncThemeColor() {
  const root = document.documentElement;
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

function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  const resolvedTheme = resolveTheme(theme);

  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  window.requestAnimationFrame(syncThemeColor);
}

function subscribeToThemeChanges(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const onThemeChange = () => {
    applyTheme(getStoredTheme());
    onStoreChange();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      volatileTheme = isThemeChoice(event.newValue) ? event.newValue : null;
      onThemeChange();
    }
  };

  const onSystemThemeChange = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  window.addEventListener('storage', onStorage);
  mediaQuery.addEventListener('change', onSystemThemeChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.removeEventListener('storage', onStorage);
    mediaQuery.removeEventListener('change', onSystemThemeChange);
  };
}

function getServerTheme(): ThemeChoice {
  return 'system';
}

export function ThemeToggle() {
  const t = useTranslations('theme');
  const theme = useSyncExternalStore<ThemeChoice>(
    subscribeToThemeChanges,
    getStoredTheme,
    getServerTheme
  );

  // Cycle order follows THEME_CHOICES: system → light → dark → system.
  const nextTheme = THEME_CHOICES[(THEME_CHOICES.indexOf(theme) + 1) % THEME_CHOICES.length];

  const cycleTheme = useCallback(() => {
    volatileTheme = nextTheme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage failures; the visual theme can still change for this page.
    }

    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, [nextTheme]);

  // Keep the DOM in sync after hydration. The pre-hydration script applies the
  // initial theme; subsequent changes also flow through the external store
  // subscription, but this guarantees the mounted component is authoritative.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const CurrentIcon = ICONS[theme];
  const currentLabel = `${t('label')}: ${t(theme)}`;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`${currentLabel}. ${t('next', { theme: t(nextTheme) })}`}
      title={currentLabel}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* key remounts the icon so the swap animation replays on every change */}
      <CurrentIcon key={theme} className="theme-icon-swap h-5 w-5" aria-hidden="true" />
    </button>
  );
}
