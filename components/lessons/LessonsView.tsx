'use client';

import { useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { List, Network } from 'lucide-react';
import type { TreeLayout } from '@/lib/lessons/tree/types';
import LessonTree from './LessonTree';

/**
 * Client shell for the Lessons index: a segmented list/tree toggle (US1) over a
 * server-rendered list (passed in as `listSlot`, so it stays SSR/SEO-friendly)
 * and the client-only {@link LessonTree}. The chosen view persists in
 * localStorage via an external store (same pattern as the theme toggle, so the
 * server snapshot is always 'list' and there is no effect-driven re-render). The
 * tree is only offered when the build-time layout is present; a null layout
 * (fail-safe) simply renders the list with no toggle.
 */

const VIEW_STORAGE_KEY = 'arabsyntax-lessons-view';
const VIEW_CHANGE_EVENT = 'arabsyntax-lessons-view-change';
type View = 'list' | 'tree';

function getStoredView(): View {
  if (typeof window === 'undefined') return 'list';
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'tree' ? 'tree' : 'list';
  } catch {
    return 'list';
  }
}

function getServerView(): View {
  return 'list';
}

function subscribeToView(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === VIEW_STORAGE_KEY) onChange();
  };
  window.addEventListener(VIEW_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(VIEW_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

interface LessonsViewProps {
  listSlot: ReactNode;
  tree: TreeLayout | null;
  rtl: boolean;
}

export default function LessonsView({ listSlot, tree, rtl }: LessonsViewProps) {
  const t = useTranslations('lessons');
  const stored = useSyncExternalStore(subscribeToView, getStoredView, getServerView);
  const view: View = tree ? stored : 'list';

  const choose = useCallback((next: View) => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Preference is best-effort; ignore storage failures.
    }
    window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
  }, []);

  if (!tree) return <>{listSlot}</>;

  const options: { value: View; label: string; Icon: typeof List }[] = [
    { value: 'list', label: t('viewList'), Icon: List },
    { value: 'tree', label: t('viewTree'), Icon: Network },
  ];

  return (
    <div>
      <div
        role="group"
        aria-label={t('viewToggleLabel')}
        className="mb-8 inline-flex rounded-lg border border-border bg-surface p-1"
      >
        {options.map(({ value, label, Icon }) => {
          const active = view === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => choose(value)}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                active ? 'bg-primary text-primary-fg' : 'text-text-muted hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {view === 'tree' ? <LessonTree layout={tree} rtl={rtl} /> : listSlot}
    </div>
  );
}
