# Feature 011 — Homepage Channel Trailer (phase 3 of "videos on the site")

**Feature Branch**: `011-home-trailer`
**Created**: 2026-11-17
**Status**: Approved 2026-11-17 — implemented
**Builds on**: `009-lesson-video`, `010-video-watch-pages`

## What

The homepage gains a `<section id="videos">` directly after the Hero: a short
heading, one line of copy, the channel trailer behind the phase-1 click-to-load
facade, a link to `/videos` and a subscribe link to the YouTube channel. The
channel is also added to the Organization structured data.

## Hard constraints

- **C-1 Pure SSG.** Channel data is read from disk at build time. Nothing new
  runs on the Worker at request time.
- **C-2 CSP unchanged.** No directive changes. The poster is self-hosted
  (`img-src 'self'`), the iframe host is already allowed, the subscribe link is
  a plain outbound `<a>`.
- **C-3 No third-party request before the click.** Loading the homepage makes
  no request to any YouTube/Google host.
- **C-4 Lesson pages unchanged.** The facade refactor produces byte-identical
  `<main>` markup on lesson pages (checked by diffing against a `main` build,
  as in phase 2).
- **C-5 No VideoObject on the homepage.** The trailer is not the page's main
  content.
- **C-6 No layout shift, Hero untouched.** The section sits after the Hero's
  closing tag; the poster box reserves its 16:9 space before the image loads.

## Data

### `content/channel.json`

```json
{
  "channelUrl": "https://www.youtube.com/@alnahwalkafi",
  "trailer": {
    "youtubeId": "2eDsj0cbCcU",
    "title": {
      "ar": "حركةٌ واحدة تغيّر المعنى | النحو الكافي",
      "en": "One Vowel Mark Changes the Meaning"
    },
    "uploadDate": "2026-11-17T02:19:40-08:00",
    "durationSeconds": 48
  }
}
```

Values read once from the public trailer page: title, duration (48 s), upload
date, and the channel URL (the page publishes `http://www.youtube.com/@alnahwalkafi`;
stored as `https`). `title.ar` is verbatim; it is displayed through the existing
`displayTitleAr` helper, so the " | النحو الكافي" suffix is not shown.
`title.en` is a draft.

The trailer is deliberately **not** in `content/videos.json`: that file's keys
must be lesson slugs, and every entry gets a watch page, sitemap entry and
VideoObject — none of which the trailer should have.

### `lib/channel/schema.ts`, `lib/channel/loader.ts`

Same shape as `lib/videos/`: strict zod schema, `server-only` memoized `fs`
loader that **throws** on a missing, unparsable or invalid file, so bad data
fails the build.

| Field | Rule |
|---|---|
| `channelUrl` | `https://www.youtube.com/@<handle>` or `https://www.youtube.com/channel/<id>`; no query string, no fragment, no trailing slash |
| `trailer.youtubeId` | `YOUTUBE_ID_PATTERN` (imported from `lib/videos/schema.ts`) |
| `trailer.title.ar`, `.en` | non-empty strings, both required |
| `trailer.uploadDate` | ISO 8601 date, or datetime with offset |
| `trailer.durationSeconds` | positive integer |

Strict objects: unknown keys are errors. `channelUrl` is restricted to
`youtube.com` because it is rendered as an outbound link and emitted as
`sameAs`; a typo'd or foreign URL should fail the build, not ship.

Pure helper `subscribeUrl(channelUrl)` → `<channelUrl>?sub_confirmation=1`.

`uploadDate` and `durationSeconds` are validated but not rendered in this phase
(there is no VideoObject here); they are kept so the record is complete.

## Poster

- `public/videos/trailer.jpg`, covered by the existing `/videos/*` cache rule.
- `scripts/fetch-video-posters.mjs` is extended: after the lesson videos it
  reads `content/channel.json` and fetches the trailer poster with the same
  fallback chain, ID check, `--force` behaviour and exit code. (YouTube serves
  a 1280×720 `maxresdefault` for the trailer.)
- **Name reservation.** `trailer` shares the poster directory — and the
  `/videos/<slug>` URL space — with lesson slugs. The videos loader's
  cross-check gains one rule: a `videos.json` key named `trailer` is rejected,
  so a future lesson can never overwrite the trailer poster or shadow it.
- The existing "every video has its poster on disk" vitest check is extended to
  the trailer.

## Component — generalizing the facade

Today `components/lessons/LessonVideo.tsx` holds both the facade (poster, play
button, click → iframe) and the lesson-specific caption links.

- **New `components/videos/VideoFacade.tsx`** (Client Component): the 16:9 box
  only — poster `<Image>`, play `<button>`, and the `youtube-nocookie.com`
  iframe after the click, with the same classes, `allow` list,
  `referrerPolicy`, `autoplay=1&rel=0` and focus hand-off as today. Props:
  `youtubeId`, `title`, `posterSrc`, `playLabel`.
- **`LessonVideo`** becomes `<figure>` + `<VideoFacade>` + its existing
  `<figcaption>`; it keeps computing the label from `lessons.videoPlay`. Its
  rendered HTML is identical.
- The homepage uses `VideoFacade` directly, with its own links below.

The phase-1 behaviour is not altered: no iframe, no preconnect, no YouTube
script until the click; autoplay only on the click-created iframe.

## Homepage section

`components/sections/TrailerSection.tsx` (async Server Component), rendered in
`app/[locale]/page.tsx` immediately after `<Hero>` and before Features.

```
<section id="videos" class="py-16 lg:py-24 bg-surface">
  heading (centered, SectionHeading)      ← h2
  one line of copy (subtitle)
  VideoFacade                              ← max-w-3xl, centered
  [ ابدأ من الدرس الأول ]  كل الدروس بالفيديو  اشترك في القناة ↗
</section>
```

- **Background** `bg-surface`: Hero and Features are both `bg-background`, so
  this keeps the alternating rhythm the other sections use.
- **Links row**, centered, stacked on mobile:
  - primary button «ابدأ من الدرس الأول» / "Start with Lesson One" →
    `/videos/elm_alnaho` (rendered only while that lesson has a video);
  - secondary link «كل الدروس بالفيديو» → `/videos`;
  - secondary link → `subscribeUrl(channelUrl)`, `target="_blank"`,
    `rel="noopener noreferrer"`, with an external-link icon.
  Internal links use next-intl `Link`, so `/en` stays in `/en`.
- **Trailer language on `/en`.** The trailer is in Arabic. The English page
  uses `title.en` for the play-button label and iframe title, and the copy says
  the video is in Arabic.
- **RTL/LTR**: centered, symmetric layout; logical utilities only; the play
  glyph is not mirrored (as in phase 1).
- **One `<section id="videos">`**, owned by the component. (Existing sections
  are wrapped a second time in `page.tsx`, producing duplicate ids such as two
  `#features`; that is pre-existing and not touched here, but not copied.)

### Drafted copy

| Key | ar | en |
|---|---|---|
| heading | النحو بالصوت والصورة | See Arabic grammar in action |
| copy | حركةٌ واحدة تغيّر المعنى كله. شاهد المقطع التعريفي في أقل من دقيقة، ثم ابدأ من الدرس الأول. | One vowel mark can change the whole meaning. Watch the trailer — under a minute, in Arabic — then start with lesson one. |
| play label | تشغيل الفيديو: {title} | Play video: {title} |
| primary button | ابدأ من الدرس الأول | Start with Lesson One |
| `/videos` link | كل الدروس بالفيديو | All video lessons |
| subscribe link | اشترك في القناة على يوتيوب | Subscribe on YouTube |
| trailer `title.en` | — | One Vowel Mark Changes the Meaning |

Strings live under `landing.videos` in both message files.

### Navigation (SectionNav)

The header does not list the homepage's sections: of five (`features`,
`how-it-works`, `screenshots`, `audiences`, `faq`) only `#features` and `#faq`
appear, alongside route links. There is no "every section is listed" pattern to
extend, and an eighth header item was already declined in phase 2, so **no
header link is added**. `/#videos` still works as a deep link:
`SectionScrollOnLoad` scrolls to any id in the URL hash.

## Channel link elsewhere

- **Footer: skipped.** The footer has three groups of internal links (Product,
  Legal, Support) and no external or social-links pattern — not even the store
  links. Adding a YouTube link would mean introducing that pattern, so per your
  instruction it is left out. (The footer already links `/videos`.)
- **Structured data**: `components/seo/StructuredData.tsx` adds
  `"sameAs": ["https://www.youtube.com/@alnahwalkafi"]` to the
  **SoftwareApplication** node (`#app`), from `channel.json` — the channel
  belongs to the product, not to the developer Organization, which is left
  unchanged. No VideoObject is added.

## Tests

**vitest**
- channel schema — valid file parses; rejects: bad/short/long/URL-shaped
  `youtubeId`; `channelUrl` that is `http://`, a non-YouTube host, a
  `youtu.be`/`watch` URL, has a query or fragment or trailing slash; missing
  locale or blank title; non-ISO date; zero/negative/fractional duration;
  unknown keys; missing `trailer`.
- `subscribeUrl` output.
- loader — real `content/channel.json` loads; memoized; throws on missing and
  invalid file (mocked `node:fs`); `lib/channel/**` at the repo's coverage
  thresholds.
- videos loader — a `videos.json` key named `trailer` is rejected.
- `public/videos/trailer.jpg` exists.

**Playwright** (`e2e/home-trailer.spec.ts`, both projects, both locales,
YouTube stubbed as before)
- `#videos` is the element immediately after the Hero section; exactly one
  element has `id="videos"`.
- before click: play button + poster visible, **no iframe**, and no request to
  any `youtube` / `ytimg` / `googlevideo` / `doubleclick` / `google` host
  through `networkidle`.
- after click: one `youtube-nocookie.com/embed/2eDsj0cbCcU` iframe, facade gone.
- the poster box keeps its 16:9 size with the image request blocked (space is
  reserved, so nothing shifts when it loads).
- `/videos` link navigates to the index (`/en/videos` from `/en`).
- subscribe link: `href` is the channel URL with `?sub_confirmation=1`,
  `target="_blank"`, `rel="noopener noreferrer"`.
- homepage JSON-LD: parses; contains no `VideoObject` and no `embedUrl`; the
  SoftwareApplication node's `sameAs` is the channel URL and the Organization
  node has none.
- `/#videos` scrolls the section into view.
- existing `lesson-video` and `video-watch` specs pass unmodified.

## Screenshots

Before/after of the homepage top (Hero + the new section), desktop 1280 and
mobile 393, Arabic and English — eight images, saved locally (not committed).

## Out of scope

Shorts; a header nav item; a footer social link; VideoObject or sitemap entry
for the trailer; a watch page for the trailer; any change to watch pages; any
change to lesson pages beyond the output-identical facade refactor; showing the
trailer's duration or date.

## Files

New: `content/channel.json`, `lib/channel/schema.ts`, `lib/channel/loader.ts`,
`components/videos/VideoFacade.tsx`, `components/sections/TrailerSection.tsx`,
`public/videos/trailer.jpg`, `test/channel-schema.test.ts`,
`test/channel-loader.test.ts`, `e2e/home-trailer.spec.ts`,
`test/channel-loader-errors.test.ts`, `specs/011-home-trailer/spec.md`.

Changed: `components/lessons/LessonVideo.tsx` (delegates to `VideoFacade`),
`app/[locale]/page.tsx` (one line), `components/seo/StructuredData.tsx`
(`sameAs`), `scripts/fetch-video-posters.mjs`, `lib/videos/schema.ts`
(reserved `trailer` key), `messages/ar.json`, `messages/en.json`, existing
videos tests (reserved key, poster check).

Not touched: `next.config.ts`, `public/_headers`, `components/layout/*`,
watch pages, the sitemap script.

## Decisions (review of 2026-11-17)

1. **`sameAs`** goes on the SoftwareApplication node (`#app`), not Organization.
2. **Screenshots** are saved locally, not committed.
3. **Copy** — heading and line kept; a primary button «ابدأ من الدرس الأول» /
   "Start with Lesson One" → `/videos/elm_alnaho` added, with «كل الدروس
   بالفيديو» as a secondary link to `/videos`.
4. **Duplicate section ids** on the homepage (`page.tsx` wraps each section
   component in a second `<section>` with the same id) are a separate bug,
   tracked in a follow-up issue and not fixed here.
