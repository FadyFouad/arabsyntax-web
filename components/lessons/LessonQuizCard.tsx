import { getTranslations } from 'next-intl/server';
import { ClipboardCheck } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getLessonQuestionCount } from '@/lib/quiz/server/bank';

/**
 * Per-lesson quiz action, shared by the lesson page and the video watch page.
 * Renders only when the bank actually has questions for this lesson, so the
 * link never lands on an empty draw. The count is resolved at build time (pure
 * SSG).
 */
export default async function LessonQuizCard({ slug }: { slug: string }) {
  if (getLessonQuestionCount(slug) <= 0) return null;
  const t = await getTranslations('lessons');

  return (
    <div className="mt-12 flex flex-col items-start gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8">
      <div className="flex items-start gap-4">
        <ClipboardCheck className="h-10 w-10 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold text-text">{t('quizLessonTitle')}</h2>
          <p className="mt-1 text-text-body">{t('quizLessonBody')}</p>
        </div>
      </div>
      <Link
        href={`/quiz?lesson=${slug}`}
        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold text-primary-fg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      >
        {t('quizLessonButton')}
      </Link>
    </div>
  );
}
