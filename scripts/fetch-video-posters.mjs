#!/usr/bin/env node
/**
 * Download a self-hosted poster for every lesson video (feature 009) and for
 * the channel trailer (feature 011).
 *
 * The lesson page shows a poster before the visitor clicks play. Hotlinking
 * i.ytimg.com would mean a Google request on every page view and a looser CSP
 * (`img-src`), so posters are copied into public/videos/<slug>.jpg and committed.
 *
 * Run by hand after adding an entry to content/videos.json (or changing the
 * trailer in content/channel.json) — it is NOT part of
 * the build, so builds and CI never depend on the network:
 *
 *   npm run videos:posters            # fetch posters that are missing
 *   npm run videos:posters -- --force # re-download all of them
 *
 * Exits 1 if any poster could not be fetched.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const VIDEOS_FILE = path.join('content', 'videos.json');
const CHANNEL_FILE = path.join('content', 'channel.json');
const OUT_DIR = path.join('public', 'videos');
// Keep in sync with RESERVED_VIDEO_SLUG in lib/videos/schema.ts.
const TRAILER_SLUG = 'trailer';
// Keep in sync with lib/videos/schema.ts and lib/lessons/loader.ts: both values
// are interpolated into a URL / a file path below.
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const SLUG_PATTERN = /^[a-z0-9_-]+$/;
// Largest first. maxresdefault (1280×720) is missing for some uploads; the
// smaller ones are 4:3 with letterbox bars, which the player box crops away.
const VARIANTS = ['maxresdefault', 'sddefault', 'hqdefault'];

const force = process.argv.includes('--force');

async function download(youtubeId) {
  for (const variant of VARIANTS) {
    const res = await fetch(`https://i.ytimg.com/vi/${youtubeId}/${variant}.jpg`);
    if (!res.ok) continue;
    const bytes = Buffer.from(await res.arrayBuffer());
    // JPEG magic number — guards against an HTML error page saved as .jpg.
    if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { bytes, variant };
    }
  }
  return null;
}

const videos = JSON.parse(readFileSync(VIDEOS_FILE, 'utf8'));
mkdirSync(OUT_DIR, { recursive: true });

// Everything that needs a poster: one per lesson video, plus the channel
// trailer (content/channel.json), which is saved as "trailer.jpg" — a name
// lib/videos/schema.ts reserves so no lesson video can collide with it.
const targets = Object.entries(videos).map(([slug, video]) => ({
  slug,
  youtubeId: video?.youtubeId,
  source: 'content/videos.json',
}));
if (existsSync(CHANNEL_FILE)) {
  const channel = JSON.parse(readFileSync(CHANNEL_FILE, 'utf8'));
  targets.push({ slug: TRAILER_SLUG, youtubeId: channel?.trailer?.youtubeId, source: 'content/channel.json' });
}

let failures = 0;
for (const { slug, youtubeId, source } of targets) {
  if (!SLUG_PATTERN.test(slug) || typeof youtubeId !== 'string' || !YOUTUBE_ID_PATTERN.test(youtubeId)) {
    console.error(`✗ ${slug}: invalid slug or youtubeId — fix ${source}`);
    failures += 1;
    continue;
  }

  const file = path.join(OUT_DIR, `${slug}.jpg`);
  if (existsSync(file) && !force) {
    console.log(`• ${slug}: already present (use --force to refresh)`);
    continue;
  }

  let poster = null;
  try {
    poster = await download(youtubeId);
  } catch (error) {
    console.error(`✗ ${slug}: ${error.message}`);
    failures += 1;
    continue;
  }
  if (!poster) {
    console.error(`✗ ${slug}: no thumbnail found for ${youtubeId}`);
    failures += 1;
    continue;
  }

  writeFileSync(file, poster.bytes);
  console.log(`✓ ${slug}: ${file} (${poster.variant}, ${Math.round(poster.bytes.length / 1024)} kB)`);
}

if (failures > 0) {
  console.error(`\n${failures} poster(s) failed.`);
  process.exit(1);
}
