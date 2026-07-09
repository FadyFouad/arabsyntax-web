import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ClipboardCheck } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import LessonSections from '@/components/lessons/LessonSections';
import MarkComplete from '@/components/lessons/MarkComplete';
import { siteConfig } from '@/lib/siteConfig';
import { getAllSlugs, getLesson, type Locale } from '@/lib/lessons/loader';
import { getLessonQuestionCount } from '@/lib/quiz/server/bank';
import { serializeJsonLd } from '@/lib/jsonLd';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

const lessonUrl = (locale: Locale, slug: string) =>
  `${siteConfig.url}${locale === 'ar' ? '' : '/en'}/lessons/${slug}`;

function metaDescription(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 160 ? `${clean.slice(0, 157)}…` : clean;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const lesson = getLesson(slug, locale as Locale);
  if (!lesson) return {};
  const description = metaDescription(lesson.description);

  return {
    title: lesson.title,
    description,
    alternates: {
      canonical: lessonUrl(locale as Locale, slug),
      languages: {
        ar: lessonUrl('ar', slug),
        en: lessonUrl('en', slug),
        'x-default': lessonUrl('ar', slug),
      },
    },
    openGraph: {
      title: lesson.title,
      description,
      url: lessonUrl(locale as Locale, slug),
      type: 'article',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
    },
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const lesson = getLesson(slug, locale as Locale);
  if (!lesson) notFound();
  const t = await getTranslations('lessons');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: lesson.title,
    inLanguage: locale,
    url: lessonUrl(locale as Locale, slug),
    description: metaDescription(lesson.description),
    learningResourceType: 'lesson',
    about: locale === 'ar' ? 'النحو العربي' : 'Arabic grammar',
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    provider: { '@id': `${siteConfig.url}/#organization` },
  };

  return (
    <Container className="py-12 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div className="mx-auto max-w-3xl">
        <Link href="/lessons" className="text-sm font-medium text-primary hover:underline">
          {t('backToLessons')}
        </Link>
        <h1 className="mb-6 mt-4 text-3xl font-bold text-text lg:text-4xl">{lesson.title}</h1>
        <div className="mb-8">
          <MarkComplete lessonId={slug} />
        </div>
        <LessonSections lesson={lesson} />
        {/* Per-lesson quiz action — only when the bank actually has questions
            for this lesson, so the link never lands on an empty draw. The count
            is resolved at build time (pure SSG). */}
        {getLessonQuestionCount(slug) > 0 && (
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
        )}
      </div>
    </Container>
  );
}
