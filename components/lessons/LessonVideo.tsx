'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/routing';
import VideoFacade from '@/components/videos/VideoFacade';

interface LessonVideoProps {
  youtubeId: string;
  /** Already resolved for the page's locale. */
  title: string;
  /** Self-hosted poster under /videos — never a YouTube thumbnail URL. */
  posterSrc: string;
  /** Locale-relative path of the video's own watch page (chapters, summary). */
  watchHref?: string;
}

/**
 * A lesson page's video (feature 009): the shared click-to-load facade plus the
 * lesson-specific caption links — the video's watch page and YouTube itself,
 * which is also the fallback when the embed is blocked.
 */
export default function LessonVideo({ youtubeId, title, posterSrc, watchHref }: LessonVideoProps) {
  const t = useTranslations('lessons');

  return (
    <figure>
      <VideoFacade
        youtubeId={youtubeId}
        title={title}
        posterSrc={posterSrc}
        playLabel={t('videoPlay', { title })}
      />
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-start">
        {watchHref && (
          <Link href={watchHref} className="text-sm font-medium text-primary hover:underline">
            {t('videoWatchPage')}
          </Link>
        )}
        <a
          href={`https://www.youtube.com/watch?v=${youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <span>{t('videoWatchOnYoutube')}</span>
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  );
}
