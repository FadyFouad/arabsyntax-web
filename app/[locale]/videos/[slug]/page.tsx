import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import LessonQuizCard from '@/components/lessons/LessonQuizCard';
import VideoPlayer from '@/components/videos/VideoPlayer';
import { siteConfig } from '@/lib/siteConfig';
import { getLesson, type Locale } from '@/lib/lessons/loader';
import { getLessonVideo, getVideoIndex } from '@/lib/videos/loader';
import { formatClock } from '@/lib/videos/format';
import { buildVideoObject, posterUrl, watchUrl } from '@/lib/videos/structuredData';
import { serializeJsonLd } from '@/lib/jsonLd';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// One watch page per entry in content/videos.json, on both locales (like i3rab).
export function generateStaticParams() {
  return getVideoIndex().map(({ slug }) => ({ slug }));
}

// The video is Arabic on both locales, so the Arabic URL is the canonical
// original (the i3rab pattern). It is also always the bare URL: chapter links
// add ?t=<seconds>, and those must never become separate indexable pages.
const arUrl = (slug: string) => watchUrl(siteConfig.url, slug);
const localeUrl = (locale: string, slug: string) =>
  `${siteConfig.url}${locale === 'ar' ? '' : '/en'}/videos/${slug}`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const video = getLessonVideo(slug);
  if (!video) return {};
  const poster = posterUrl(siteConfig.url, slug);

  return {
    title: video.title.ar,
    description: video.summary.ar,
    alternates: {
      // Arabic is the canonical original on BOTH locales, so no `en` hreflang —
      // it would point at a URL that canonicalizes away.
      canonical: arUrl(slug),
      languages: {
        ar: arUrl(slug),
        'x-default': arUrl(slug),
      },
    },
    openGraph: {
      title: video.title.ar,
      description: video.summary.ar,
      url: localeUrl(locale, slug),
      type: 'video.other',
      locale: 'ar_AR', // content is Arabic regardless of UI locale
      images: [{ url: poster, width: 1280, height: 720 }],
    },
  };
}

export default async function VideoWatchPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const video = getLessonVideo(slug);
  if (!video) notFound();
  const t = await getTranslations('videos');
  // Every video key is a lesson slug (enforced by the loader); the lesson title
  // is in the page's locale because it labels a link into that locale's lesson.
  const lesson = getLesson(slug, locale as Locale);

  const published = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(video.uploadDate));

  // Title, summary and chapters are Arabic on both locales; only the page chrome
  // is translated. Mark the Arabic text up so /en renders and announces it right.
  const arabic = locale === 'ar' ? {} : ({ lang: 'ar', dir: 'rtl' } as const);

  return (
    <Container className="py-8 lg:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildVideoObject({ slug, video, siteUrl: siteConfig.url })),
        }}
      />
      <div className="mx-auto max-w-3xl">
        <Link href="/videos" className="text-sm font-medium text-primary hover:underline">
          {t('backToIndex')}
        </Link>
        {/* The player comes first — above the heading — so the video is the
            page's main content and sits inside the first viewport. */}
        <div className="mt-4">
          <VideoPlayer
            youtubeId={video.youtubeId}
            title={video.title.ar}
            durationSeconds={video.durationSeconds}
            chapters={video.chapters}
          >
            <h1 {...arabic} className="mt-6 text-2xl font-bold text-text lg:text-3xl">
              {video.title.ar}
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              <span>{t('duration', { time: formatClock(video.durationSeconds) })}</span>
              <span aria-hidden="true"> · </span>
              <span>{t('publishedOn', { date: published })}</span>
            </p>
            <p {...arabic} className="mt-4 text-lg leading-relaxed text-text-body">
              {video.summary.ar}
            </p>
          </VideoPlayer>
        </div>

        {lesson && (
          <div className="mt-12 flex flex-col items-start gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8">
            <div className="flex items-start gap-4">
              <BookOpen className="h-10 w-10 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-semibold text-text">{t('lessonCardTitle')}</h2>
                <p className="mt-1 text-text-body">{lesson.title}</p>
              </div>
            </div>
            <Link
              href={`/lessons/${slug}`}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-primary px-6 py-3 font-bold text-primary transition-colors hover:bg-primary hover:text-primary-fg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {t('lessonCardButton')}
            </Link>
          </div>
        )}
        <LessonQuizCard slug={slug} />
      </div>
    </Container>
  );
}
