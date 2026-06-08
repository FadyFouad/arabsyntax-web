'use client';

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
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
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const theme = useSyncExternalStore<ThemeChoice>(
    subscribeToThemeChanges,
    getStoredTheme,
    getServerTheme
  );
  const [isOpen, setIsOpen] = useState(false);

  const selectTheme = useCallback((nextTheme: ThemeChoice) => {
    volatileTheme = nextTheme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage failures; the visual theme can still change for this page.
    }

    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    setIsOpen(false);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const CurrentIcon = ICONS[theme];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`${t('label')}: ${t(theme)}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <CurrentIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('label')}
          className="absolute end-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-surface-elevated p-1 shadow-lg"
        >
          {THEME_CHOICES.map((choice) => {
            const Icon = ICONS[choice];
            const isSelected = choice === theme;

            return (
              <button
                key={choice}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => selectTheme(choice)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm font-medium text-text transition-colors hover:bg-surface hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{t(choice)}</span>
                {isSelected && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
