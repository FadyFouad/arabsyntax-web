'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { useCompletedLessons } from './useLessonProgress';

/**
 * Small completion badge for list-view lesson cards. Renders nothing until the
 * lesson is completed, then a subtle "Completed" pill — a lightweight status cue
 * that keeps the list in sync with the tree without redesigning the card. The
 * list has no lock concept (every lesson is directly reachable), so completion
 * is the only state to surface here.
 */
export default function LessonStatusBadge({ lessonId }: { lessonId: string }) {
  const t = useTranslations('lessons');
  const completed = useCompletedLessons();
  if (!completed.has(lessonId)) return null;

  return (
    <span className="mt-3 inline-flex w-fit items-center gap-1 self-start rounded-full border border-success px-2 py-0.5 text-xs font-medium text-success">
      <Check className="h-3 w-3" aria-hidden="true" />
      {t('completedBadge')}
    </span>
  );
}
