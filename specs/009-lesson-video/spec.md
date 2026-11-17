# Feature 009 — Optional YouTube Lesson Video (phase 1 of "videos on the site")

**Feature Branch**: `009-lesson-video`
**Created**: 2026-11-17
**Status**: Approved 2026-11-17 — implemented

## What

A lesson page may carry one YouTube video. When it does, a click-to-load player
appears between the title and the lesson body. Lessons without a video render
exactly as they do today. Adding a video later is one entry in one JSON file
plus one poster image.

## Hard constraints

- **C-1 Build-time only.** Lesson pages stay fully SSG. No new request-time work
  on the Worker: no fetch, no API call, no YouTube lookup at render. The video
  record is read from disk during prerender, like lesson content.
- **C-2 No third-party request before the click.** Until the visitor presses
  play, the page makes zero requests to any Google/YouTube host: the poster is
  self-hosted and the iframe does not exist in the DOM.
- **C-3 CSP.** Exactly one change: `https://www.youtube-nocookie.com` is added to
  `frame-src`. `img-src`, `script-src`, `connect-src` and every other directive
  are untouched.
- **C-4 Zero diff for lessons without a video.** Same markup, same client JS
  behaviour.
- **C-5** ar + en via next-intl, RTL/LTR-safe (logical properties only),
  design-system tokens only (`check-tokens` passes).

## Data

### `content/videos.json`

A map of lesson slug → video record:

```json
{
  "aqsam_kalam": {
    "youtubeId": "XXXXXXXXXXX",
    "title": { "ar": "…", "en": "…" },
    "description": { "ar": "…", "en": "…" },
    "uploadDate": "2026-11-15T11:37:45-08:00",
    "durationSeconds": 612
  }
}
```

| Field | Rule |
|---|---|
| key | must be an existing lesson slug (`getAllSlugs()`, i.e. `manifest.json`) |
| `youtubeId` | `/^[A-Za-z0-9_-]{11}$/` |
| `title.ar`, `title.en` | non-empty strings, both required |
| `description.ar`, `description.en` | non-empty strings, both required |
| `uploadDate` | ISO 8601 — a date (`2026-10-01`) or a datetime with offset |
| `durationSeconds` | positive integer |

Objects are strict: an unknown key (e.g. a typo like `youtubeID`) is an error.

`description`, `uploadDate` and `durationSeconds` are **stored and validated but
not rendered in phase 1** — they exist so phase 2 (VideoObject JSON-LD, video
sitemap) needs no data migration.

### `lib/videos/schema.ts`, `lib/videos/loader.ts`

Mirrors `lib/lessons/`: zod schemas in `schema.ts`; a `server-only`, memoized
`fs` loader in `loader.ts`.

- `getLessonVideo(slug): LessonVideo | null` — the page's only entry point.
- `getAllLessonVideos()` — the full validated map (used by tests; phase 2 will
  use it too).

**Failure mode — deliberate difference from the lessons loader.** The lessons
loader swallows a bad file and degrades. The videos loader **throws** with a
message naming the offending slug/field. Because the loader only runs during
prerender, a bad slug or bad ID fails `npm run build` instead of silently
shipping a page without its video (or with a broken embed). A missing
`videos.json` is also a build error.

Cross-validation against lesson slugs is a pure function taking the slug list as
an argument, so it is unit-testable without touching real content.

## Seed entries

| Lesson slug | Lesson | youtubeId |
|---|---|---|
| `aqsam_kalam` | أقسام الكلام | `HsAQqiWgIhg` |
| `alesm` | علامات الاسم | `I2gepg1axps` |
| `aqsam_alfeal` | أقسام الفعل | `W77q6Ne3AAU` |
| `horof_gar` | حروف الجر | `3jPaRjMrf8I` |
| `elm_alnaho` | علم النحو في اللغة العربية — هل هو كابوس حقا ؟! | `H1Ml29ytjQ0` |

- The «علم النحو» intro video maps to **`elm_alnaho`** — it exists in
  `manifest.json` and is the root node of the lesson tree.
- The video supplied as "alfeal" is titled «أقسام الفعل». No lesson has the slug
  `alfeal`; it maps to **`aqsam_alfeal`** (AR title «أقسام الفعل», the node the
  lesson tree uses). The similarly named `aqsam_feaal` («أقسام الفعل من حيث
  الزمن») covers tense only and is not in the tree.
- "horoof aljar" maps to **`horof_gar`**.

Arabic `title`/`description` are stored exactly as published on YouTube;
`uploadDate` and `durationSeconds` are taken from the video page. English
`title`/`description` are drafts written for this feature.

## Posters

- Stored at `public/videos/<slug>.jpg`, committed to the repo, served by the
  Workers Assets binding. `img-src` stays `'self' data:`.
- `scripts/fetch-video-posters.mjs` (npm script `videos:posters`): for each
  entry in `videos.json`, downloads the YouTube thumbnail — `maxresdefault.jpg`
  (1280×720), falling back to `sddefault.jpg` then `hqdefault.jpg` — and writes
  `public/videos/<slug>.jpg`. Skips files that already exist unless `--force`.
  Validates the ID with the same regex before building a URL. Exits non-zero if
  any poster could not be fetched.
- The script is run **by hand when adding a video**; it is not wired into
  `prebuild`, so builds and CI never depend on the network or on YouTube.
- A vitest content-integrity check asserts every `videos.json` entry has its
  poster file on disk, so a forgotten poster fails CI rather than shipping a
  broken image.

Adding a video = add the entry → `npm run videos:posters` → commit both.

## Component — `components/lessons/LessonVideo.tsx`

Client component (`'use client'` justified: it holds the one bit of
"activated" state). Props: `youtubeId`, `title` (already locale-resolved),
`posterSrc`.

**Before click (facade)**
- A 16:9 box (`aspect-video`, rounded, bordered — Card tokens) containing the
  poster `<img>` with explicit `width`/`height` (no layout shift) and `alt=""`
  (decorative; the button carries the name).
- A single `<button type="button">` covering the box, with a centered play
  glyph (lucide `Play`, `aria-hidden`) and accessible name
  `t('videoPlay', { title })` → "تشغيل الفيديو: …" / "Play video: …". Visible
  focus ring using the existing `focus:ring-primary` pattern. Keyboard: Enter /
  Space activate (native button).
- No `<iframe>`, no preconnect, no YouTube script.

**After click**
- The facade is replaced by
  `<iframe src="https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0">`
  in the same 16:9 box, with `title={title}`, `allowFullScreen`,
  `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"`
  and `referrerPolicy="strict-origin-when-cross-origin"` (YouTube rejects
  embeds that send no referrer).
- `autoplay=1` is only ever present on an iframe the user's click created, so
  nothing plays on page load. Focus moves to the iframe so keyboard users are
  not stranded on a removed button.

**Below the player (both states)**
- A small link, `t('videoWatchOnYoutube')` → "شاهد على يوتيوب" /
  "Watch on YouTube", to `https://www.youtube.com/watch?v=<id>`,
  `target="_blank" rel="noopener noreferrer"`. This is also the fallback when
  the embed is blocked (ad-blocker, network policy).

**Layout direction**: the box is full-width and symmetric; the play glyph is
centered and not mirrored (a play triangle is a media-control convention, not a
directional arrow); the link aligns to the inline start via logical utilities.

## Placement

In `app/[locale]/lessons/[slug]/page.tsx`:

```
<h1>
<MarkComplete>          ← unchanged
<LessonVideo>           ← new, only when getLessonVideo(slug) is non-null
<LessonSections>
```

The video sits directly above the lesson body, after the existing
`MarkComplete` block, so the title area is identical with or without a video.
`getLessonVideo(slug)` is called after the existing `notFound()` guard, so an
unknown slug never reaches the videos loader.

## CSP change (`next.config.ts`)

```diff
   // challenges.cloudflare.com: the contact form's Turnstile widget renders in an
   // iframe from there.
-  directive('frame-src', 'https://challenges.cloudflare.com', ...firebaseFrame),
+  // www.youtube-nocookie.com: lesson videos (feature 009) play in an iframe from
+  // there, mounted only after the visitor clicks the self-hosted poster. Posters
+  // are served from /videos, so img-src needs no YouTube/ytimg allowance.
+  directive(
+    'frame-src',
+    'https://challenges.cloudflare.com',
+    'https://www.youtube-nocookie.com',
+    ...firebaseFrame,
+  ),
```

Nothing else changes. The existing `Permissions-Policy` header does not restrict
`autoplay` or `fullscreen`, so it needs no edit.

## i18n

New keys under `lessons` in `messages/ar.json` and `messages/en.json`:

| Key | ar | en |
|---|---|---|
| `videoPlay` | `تشغيل الفيديو: {title}` | `Play video: {title}` |
| `videoWatchOnYoutube` | `شاهد على يوتيوب` | `Watch on YouTube` |

Video titles come from `videos.json` (`title[locale]`), not from messages.

## Tests

**vitest** (`test/videos-schema.test.ts`, `test/videos-loader.test.ts`)
- valid record parses; every seed entry in the real `videos.json` is valid
- bad ID rejected: 10 chars, 12 chars, illegal character, full URL
- bad slug rejected: key not in the lesson slug list → error names the slug
- missing locale in `title`/`description`, non-ISO `uploadDate`, zero/negative/
  fractional `durationSeconds`, unknown key → rejected
- loader: `getLessonVideo` returns the record for a seeded slug, `null` for a
  lesson without one; memoization hit path; throws on invalid file and on
  missing file (mocked `node:fs`, same technique as `i3rab-loader-errors`)
- integrity: every entry has `public/videos/<slug>.jpg`
- `lib/videos/**` held to the repo's existing coverage thresholds

**Playwright** (`e2e/lesson-video.spec.ts`, both projects)
- lesson with a video (`/lessons/aqsam_kalam`, `/en/lessons/aqsam_kalam`): play
  button and poster visible, **zero** `iframe` elements, and no request to any
  `youtube`/`ytimg`/`google` host during load
- click → exactly one iframe whose `src` starts with
  `https://www.youtube-nocookie.com/embed/<id>`; facade button gone
- "Watch on YouTube" link has the right `href`, `target`, `rel`
- lesson without a video (`/lessons/alhaal`): no play button, no iframe, no
  "Watch on YouTube" link
- Requests to `youtube-nocookie.com` are intercepted and stubbed in the test so
  the suite stays hermetic and does not depend on YouTube being reachable.

## Out of scope (not implemented in this phase)

VideoObject JSON-LD, video sitemap entries, a `/videos` page, any homepage
section, Shorts, visible duration/description/upload date, analytics events,
captions/transcripts.

## Files

New: `content/videos.json`, `lib/videos/schema.ts`, `lib/videos/loader.ts`,
`components/lessons/LessonVideo.tsx`, `scripts/fetch-video-posters.mjs`,
`public/videos/*.jpg` (5), `test/videos-*.test.ts`, `e2e/lesson-video.spec.ts`.

Changed: `app/[locale]/lessons/[slug]/page.tsx`, `next.config.ts` (frame-src
only), `messages/ar.json`, `messages/en.json`, `package.json` (one script),
`public/_headers` (`/videos/*` cache rule, matching `/og/*`).

## Decisions (review of 2026-11-17)

1. **YouTube IDs** — supplied; five seed entries (table above).
2. **Metadata** — read once from each public video page (see Seed entries).
3. **Poster caching** — yes: `public/_headers` gains a `/videos/*` rule
   identical to `/og/*` (7-day `Cache-Control` + `nosniff`).
4. **Placement** — after `MarkComplete`, directly above the lesson body.
5. **Autoplay** — `autoplay=1` stays on the click-created iframe.
