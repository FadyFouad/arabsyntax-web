import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import { siteConfig } from '@/lib/siteConfig';
import type { Locale } from '@/lib/lessons/loader';
import { getVideoIndex } from '@/lib/videos/loader';
import { videoPosterSrc } from '@/lib/videos/schema';
import { displayTitleAr, formatClock } from '@/lib/videos/format';
import { videosIndexUrl } from '@/lib/videos/structuredData';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// The videos are Arabic, so (like /i3rab) the Arabic index is the canonical
// original on both locales.
const arIndexUrl = videosIndexUrl(siteConfig.url);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'videos' });
  return {
    title: t('indexTitle'),
    description: t('indexSubtitle'),
    alternates: {
      canonical: arIndexUrl,
      languages: {
        ar: arIndexUrl,
        'x-default': arIndexUrl,
      },
    },
    openGraph: {
      title: t('indexTitle'),
      description: t('indexSubtitle'),
      url: `${siteConfig.url}${locale === 'ar' ? '' : '/en'}/videos`,
      type: 'website',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
    },
  };
}

export default async function VideosIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('videos');
  // Curriculum (lesson tree) order. Posters are self-hosted, so this page
  // makes no request to YouTube.
  const videos = getVideoIndex();

  return (
    <Container className="py-12 lg:py-16">
      <SectionHeading heading={t('indexTitle')} subtitle={t('indexSubtitle')} className="mb-10" />
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {videos.map(({ slug, video }) => (
          <li key={slug}>
            <Link
              href={`/videos/${slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="relative aspect-video bg-background">
                <Image
                  src={videoPosterSrc(slug)}
                  alt=""
                  width={1280}
                  height={720}
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute bottom-2 end-2 rounded-lg bg-background px-2 py-1 text-xs font-semibold tabular-nums text-text">
                  <span className="sr-only">{t('durationLabel')} </span>
                  {formatClock(video.durationSeconds)}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-6">
                <h3 className="text-xl font-semibold text-text group-hover:text-primary">
                  {locale === 'ar' ? displayTitleAr(video.title.ar) : video.title[locale as Locale]}
                </h3>
                <p className="text-text-body">{video.summary[locale as Locale]}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
