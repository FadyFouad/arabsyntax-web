'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { formatClock, parseStartParam, videoEmbedUrl } from '@/lib/videos/format';

interface Chapter {
  startSeconds: number;
  title: string;
}

interface VideoPlayerProps {
  youtubeId: string;
  /** Arabic display title — the iframe's accessible name. */
  title: string;
  durationSeconds: number;
  chapters?: Chapter[];
  /** Rendered between the player and the chapter list (heading, summary). */
  children?: ReactNode;
}

// The URL's ?t= is external state the server cannot see (the page is static),
// so it is read through useSyncExternalStore: null during SSR/hydration, the
// real value right after. Nothing to subscribe to — the page itself is the only
// thing that changes it, and that goes through React state below.
const subscribeToNothing = () => () => {};

/**
 * Watch-page player (feature 010): the YouTube iframe is rendered directly, in
 * the server HTML, with no facade and no autoplay — watching is the purpose of
 * this page and search engines must be able to see the player. (Lesson pages
 * keep the click-to-load facade in components/lessons/LessonVideo.tsx.)
 *
 * Chapters seek with the embed's documented `start` parameter rather than the
 * IFrame Player API: that API needs a youtube.com script the CSP does not allow,
 * while `start` needs nothing but the iframe. Each chapter is a real `?t=<n>`
 * link (the URL the page's Clip structured data advertises), intercepted on a
 * plain click to restart the player in place.
 *
 * A Client Component because the player and the chapter list share the
 * "current start" state.
 */
export default function VideoPlayer({ youtubeId, title, durationSeconds, chapters, children }: VideoPlayerProps) {
  const t = useTranslations('videos');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Start time carried by the URL when the page was opened (shared chapter link).
  const urlStart = useSyncExternalStore(
    subscribeToNothing,
    () => parseStartParam(window.location.search, durationSeconds),
    () => null,
  );
  // Start time chosen by clicking a chapter. `seq` remounts the iframe even when
  // the same chapter is clicked twice, so "replay this chapter" works.
  const [picked, setPicked] = useState<{ seconds: number; seq: number } | null>(null);

  const start = picked ? picked.seconds : urlStart;
  const params = new URLSearchParams();
  if (start) params.set('start', String(start));
  // Autoplay only ever follows a click on a chapter — never a page load.
  if (picked) params.set('autoplay', '1');
  params.set('rel', '0');
  const src = `${videoEmbedUrl(youtubeId)}?${params.toString()}`;

  // After a chapter click the player reloads; move focus to it so keyboard and
  // screen-reader users land on the video they just asked for.
  useEffect(() => {
    if (picked) iframeRef.current?.focus();
  }, [picked]);

  function handleChapterClick(event: MouseEvent<HTMLAnchorElement>, seconds: number) {
    // Leave modified clicks alone: open-in-new-tab must behave like a real link.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setPicked((previous) => ({ seconds, seq: (previous?.seq ?? 0) + 1 }));
    // Keep the address bar shareable without adding a history entry per chapter.
    window.history.replaceState(null, '', seconds > 0 ? `?t=${seconds}` : window.location.pathname);
  }

  return (
    <>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-surface">
        <iframe
          key={picked ? `picked-${picked.seq}` : `initial-${urlStart ?? 0}`}
          ref={iframeRef}
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          // YouTube refuses embeds that arrive without a referrer.
          referrerPolicy="strict-origin-when-cross-origin"
          loading="eager"
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {children}

      {chapters && chapters.length > 0 && (
        <section aria-labelledby="video-chapters" className="mt-8">
          <h2 id="video-chapters" className="mb-3 text-xl font-semibold text-text">
            {t('chaptersTitle')}
          </h2>
          {/* Chapter titles are Arabic on both locales, so the list is always RTL
              and always in the Arabic webfont (on /en the body font is Latin). */}
          <ol lang="ar" dir="rtl" className="font-arabic divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {chapters.map((chapter) => {
              const current = (start ?? 0) === chapter.startSeconds && (picked !== null || urlStart !== null);
              return (
                <li key={chapter.startSeconds}>
                  <a
                    href={`?t=${chapter.startSeconds}`}
                    onClick={(event) => handleChapterClick(event, chapter.startSeconds)}
                    aria-current={current ? 'true' : undefined}
                    className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                      current ? 'text-primary' : 'text-text-body'
                    }`}
                  >
                    <span dir="ltr" className="w-12 shrink-0 text-sm font-semibold tabular-nums text-primary">
                      {formatClock(chapter.startSeconds)}
                    </span>
                    <span className="font-medium">{chapter.title}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </>
  );
}
