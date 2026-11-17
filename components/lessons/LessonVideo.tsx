'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ExternalLink, Play } from 'lucide-react';
import { Link } from '@/i18n/routing';

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
 * Click-to-load YouTube player for a lesson page (feature 009).
 *
 * Until the visitor presses play this is only a self-hosted poster and a
 * button: no iframe, no YouTube script, no request to any Google host. The
 * click mounts a youtube-nocookie.com iframe in the same 16:9 box, so the
 * embed's weight and cookies are paid only by people who chose to watch.
 *
 * A Client Component because it owns that one bit of "activated" state.
 */
export default function LessonVideo({ youtubeId, title, posterSrc, watchHref }: LessonVideoProps) {
  const t = useTranslations('lessons');
  const [activated, setActivated] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The play button unmounts on activation; hand focus to the player so
  // keyboard users are not dropped back to the top of the document.
  useEffect(() => {
    if (activated) iframeRef.current?.focus();
  }, [activated]);

  return (
    <figure>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-surface">
        {activated ? (
          <iframe
            ref={iframeRef}
            // autoplay=1 is safe here: this iframe only exists because of a
            // click, so nothing ever plays on page load.
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            // YouTube refuses embeds that arrive without a referrer.
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <>
            <Image
              src={posterSrc}
              alt=""
              width={1280}
              height={720}
              sizes="(min-width: 768px) 768px, 100vw"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setActivated(true)}
              aria-label={t('videoPlay', { title })}
              className="group absolute inset-0 flex items-center justify-center rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg transition-transform group-hover:scale-110 motion-reduce:transition-none">
                {/* A play triangle is a media-control glyph, not a directional
                    arrow, so it is not mirrored in RTL. */}
                <Play className="h-7 w-7 fill-current" aria-hidden="true" />
              </span>
            </button>
          </>
        )}
      </div>
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
