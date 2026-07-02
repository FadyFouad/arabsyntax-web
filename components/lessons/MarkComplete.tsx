'use client';

import { useTranslations } from 'next-intl';
import { Check, Circle } from 'lucide-react';
import { useCompletedLessons, setLessonComplete } from './useLessonProgress';

/**
 * Completion toggle on the lesson detail page (US3). The only progress signal
 * the web app has — clicking it marks the lesson done, which unlocks dependent
 * nodes in the tree. State is read from the shared local store, so the tree and
 * this button stay in sync across tabs.
 */
export default function MarkComplete({ lessonId }: { lessonId: string }) {
  const t = useTranslations('lessons');
  const completed = useCompletedLessons();
  const done = completed.has(lessonId);

  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={() => setLessonComplete(lessonId, !done)}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
        done
          ? 'border-success text-success hover:border-text-muted hover:text-text-muted'
          : 'border-primary bg-primary text-primary-fg hover:bg-primary-hover'
      }`}
    >
      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
      <span>{done ? t('completedBadge') : t('markComplete')}</span>
    </button>
  );
}
