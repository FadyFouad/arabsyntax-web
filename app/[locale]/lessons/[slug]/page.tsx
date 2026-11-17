import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import LessonSections from '@/components/lessons/LessonSections';
import MarkComplete from '@/components/lessons/MarkComplete';
import LessonQuizCard from '@/components/lessons/LessonQuizCard';
import LessonVideo from '@/components/lessons/LessonVideo';
import { siteConfig } from '@/lib/siteConfig';
import { getAllSlugs, getLesson, type Locale } from '@/lib/lessons/loader';
import { getLessonVideo } from '@/lib/videos/loader';
import { videoPosterSrc } from '@/lib/videos/schema';
import { lessonResourceId } from '@/lib/videos/structuredData';
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
  // Resolved at build time (pure SSG); null for the many lessons without one.
  const video = getLessonVideo(slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    // Stable node id so the lesson's video (a VideoObject on its own watch page,
    // never here) can reference this resource via isPartOf.
    '@id': lessonResourceId(lessonUrl(locale as Locale, slug)),
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
        {video && (
          <div className="mb-8">
            <LessonVideo
              youtubeId={video.youtubeId}
              title={video.title[locale as Locale]}
              posterSrc={videoPosterSrc(slug)}
              watchHref={`/videos/${slug}`}
            />
          </div>
        )}
        <LessonSections lesson={lesson} />
        <LessonQuizCard slug={slug} />
      </div>
    </Container>
  );
}
