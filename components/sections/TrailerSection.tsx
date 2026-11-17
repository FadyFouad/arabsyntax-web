import { getTranslations } from 'next-intl/server';
import { ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/routing';
import SectionHeading from '@/components/ui/SectionHeading';
import VideoFacade from '@/components/videos/VideoFacade';
import { getChannel } from '@/lib/channel/loader';
import { subscribeUrl, TRAILER_POSTER_SLUG } from '@/lib/channel/schema';
import { getLessonVideo } from '@/lib/videos/loader';
import { videoPosterSrc } from '@/lib/videos/schema';
import { displayTitleAr } from '@/lib/videos/format';

/** The lesson whose video the "Start with Lesson One" button opens. */
const FIRST_LESSON_SLUG = 'elm_alnaho';

/**
 * Homepage channel-trailer section (feature 011), directly after the Hero.
 *
 * The trailer sits behind the click-to-load facade, so loading the homepage
 * makes no request to YouTube; the poster is self-hosted and its 16:9 box is
 * reserved up front. There is deliberately no VideoObject here — the trailer is
 * not the homepage's main content (video structured data lives on the watch
 * pages). Everything is resolved at build time.
 */
export default async function TrailerSection({ locale }: { locale: string }) {
  const t = await getTranslations('landing.videos');
  const { channelUrl, trailer } = getChannel();
  // The trailer is in Arabic; the English page labels it with the English title.
  const title = locale === 'ar' ? displayTitleAr(trailer.title.ar) : trailer.title.en;
  // Only offer "Lesson One" while that lesson actually has a video.
  const hasFirstLesson = getLessonVideo(FIRST_LESSON_SLUG) !== null;

  return (
    <section id="videos" className="bg-surface py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading heading={t('heading')} subtitle={t('subtitle')} className="mb-10 text-center" />
        <div className="mx-auto max-w-3xl">
          <VideoFacade
            youtubeId={trailer.youtubeId}
            title={title}
            posterSrc={videoPosterSrc(TRAILER_POSTER_SLUG)}
            playLabel={t('play', { title })}
          />
          <div className="mt-8 flex flex-col items-center justify-center gap-x-6 gap-y-4 sm:flex-row sm:flex-wrap">
            {hasFirstLesson && (
              <Link
                href={`/videos/${FIRST_LESSON_SLUG}`}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold text-primary-fg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
              >
                {t('startLessonOne')}
              </Link>
            )}
            <Link href="/videos" className="font-medium text-primary hover:underline">
              {t('allVideos')}
            </Link>
            <a
              href={subscribeUrl(channelUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <span>{t('subscribe')}</span>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
