/**
 * Pure time helpers for lesson videos. No imports on purpose: this file is
 * pulled into the watch page's Client Component, so it must not drag the zod
 * schemas (or anything server-only) into the browser bundle.
 */

/** Seconds → ISO 8601 duration as schema.org wants it: 241 → "PT4M1S". */
export function formatIsoDuration(totalSeconds: number): string {
  if (!Number.isInteger(totalSeconds) || totalSeconds <= 0) {
    throw new RangeError(`duration must be a positive whole number of seconds, got ${totalSeconds}`);
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${seconds ? `${seconds}S` : ''}`;
}

/** Seconds → player-style clock: 241 → "4:01", 3723 → "1:02:03". */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = String(safe % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/**
 * Read the `?t=<seconds>` start time off a watch-page URL's query string.
 *
 * Returns null for anything that is not a plain whole number strictly inside
 * the video (0 is "the beginning", i.e. no offset). The value ends up in an
 * iframe URL, so it is parsed to a number here and never passed through as text.
 */
export function parseStartParam(search: string, durationSeconds: number): number | null {
  const raw = new URLSearchParams(search).get('t');
  if (raw === null || !/^\d{1,6}$/.test(raw)) return null;
  const seconds = Number(raw);
  return seconds > 0 && seconds < durationSeconds ? seconds : null;
}

/**
 * Arabic video title as shown on the site: the YouTube title minus its trailing
 * channel suffix (" | النحو الكافي"). On YouTube the suffix names the channel;
 * here it would only repeat the site name next to every title (and twice in the
 * document <title>, whose template appends it). Only that exact trailing suffix
 * is removed — "| الدرس الأول" and any other "|" segment stay. `title.ar` in
 * content/videos.json remains the verbatim YouTube title.
 */
export function displayTitleAr(title: string): string {
  return title.replace(/\s*\|\s*النحو الكافي\s*$/u, '').trim();
}

/**
 * Curriculum order for videos: the lesson tree's node order first (the path a
 * learner actually follows), then any remaining slug in lesson-manifest order —
 * so a video whose lesson is not in the tree is still listed, never dropped.
 */
export function curriculumOrder(
  videoSlugs: readonly string[],
  treeLessonIds: readonly string[],
  manifestSlugs: readonly string[],
): string[] {
  const wanted = new Set(videoSlugs);
  const ordered: string[] = [];
  for (const slug of [...treeLessonIds, ...manifestSlugs, ...videoSlugs]) {
    if (wanted.delete(slug)) ordered.push(slug);
  }
  return ordered;
}

/** youtube-nocookie embed URL — the bare form is also the JSON-LD `embedUrl`. */
export function videoEmbedUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
}
