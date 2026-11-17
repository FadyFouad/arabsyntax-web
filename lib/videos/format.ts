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

/** youtube-nocookie embed URL — the bare form is also the JSON-LD `embedUrl`. */
export function videoEmbedUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
}
