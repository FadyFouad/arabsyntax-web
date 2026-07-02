'use client';

import { useEffect, useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Circle, Lock, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { LayoutNode, NodeState } from '@/lib/lessons/tree/types';
import { setLessonComplete } from './useLessonProgress';

/**
 * Detail dialog for a tapped tree node (US3/US4). Shows the node's state, a link
 * into the lesson, a completion toggle (only once unlocked), and — for a locked
 * node — the prerequisites still to finish. Titles for prerequisites come from
 * the layout via `titleById`.
 */

interface NodeSheetProps {
  node: LayoutNode;
  state: NodeState;
  titleById: ReadonlyMap<string, string>;
  completed: ReadonlySet<string>;
  onClose: () => void;
}

const STATE_LABEL: Record<NodeState, string> = {
  locked: 'stateLocked',
  available: 'stateAvailable',
  completed: 'stateCompleted',
  needsReview: 'stateAvailable',
};

export default function NodeSheet({ node, state, titleById, completed, onClose }: NodeSheetProps) {
  const t = useTranslations('lessons');
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const done = state === 'completed';
  const locked = state === 'locked';
  const missing = node.prerequisites.filter((id) => !completed.has(id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-border bg-surface-elevated p-6 shadow-lg sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-text">
              {node.title}
            </h2>
            <span
              className={`mt-1 inline-flex items-center gap-1 text-sm font-medium ${
                done ? 'text-success' : locked ? 'text-text-muted' : 'text-primary'
              }`}
            >
              {done ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : locked ? (
                <Lock className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4" aria-hidden="true" />
              )}
              {t(STATE_LABEL[state])}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={t('close')}
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {locked && missing.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-text-secondary">{t('lockedHint')}</p>
            <ul className="space-y-1">
              {missing.map((id) => (
                <li key={id} className="flex items-center gap-2 text-sm text-text-muted">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {titleById.get(id) ?? id}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href={`/lessons/${node.lessonId}`}
            className="inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {t('openLesson')}
          </Link>

          {!locked && (
            <button
              type="button"
              aria-pressed={done}
              onClick={() => setLessonComplete(node.lessonId, !done)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                done
                  ? 'border-border text-text-muted hover:border-primary hover:text-primary'
                  : 'border-success text-success hover:bg-success hover:text-primary-fg'
              }`}
            >
              {done ? <Circle className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              <span>{done ? t('markIncomplete') : t('markComplete')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
