# Feature 010 — Video Watch Pages (phase 2 of "videos on the site")

**Feature Branch**: `010-video-watch-pages`
**Created**: 2026-11-17
**Status**: Approved 2026-11-17 — implemented
**Builds on**: `009-lesson-video`

## What

Each entry in `content/videos.json` gets a dedicated watch page where the video
is the main content, plus a `/videos` index. All video SEO (VideoObject JSON-LD,
video sitemap entries) points at the watch pages. Lesson pages stay text-first
and gain only a link to the watch page.

## Hard constraints

- **C-1 Pure SSG.** Watch pages and the index are prerendered
  (`generateStaticParams` over `videos.json`). No `searchParams` prop, no
  `useSearchParams`, no fetch, no API route — nothing that opts a page into
  request-time rendering.
- **C-2 CSP unchanged.** This phase changes **no** CSP directive. `frame-src`
  already allows `https://www.youtube-nocookie.com` (feature 009); no script
  host is added (see "Chapter seeking").
- **C-3 Phase-1 facade behaviour unchanged.** Lesson pages still load nothing
  from YouTube before a click.
- **C-4** next-intl strings, design tokens only, logical properties (RTL/LTR).

## Data

### `content/videos.json` — two new fields

```json
"summary": { "ar": "…", "en": "…" },
"chapters": [
  { "startSeconds": 0, "title": "مقدمة" },
  { "startSeconds": 13, "title": "ما هو الكلام؟" }
]
```

| Field | Rule |
|---|---|
| `summary.ar`, `summary.en` | **required**; 1–300 characters after trim; single line; no URL (`http://`, `https://`, `www.`); no `#`; no timestamp (`m:ss` / `h:mm:ss`) |
| `chapters` | **optional**; when present, at least 2 entries |
| `chapters[].startSeconds` | non-negative integer; first is `0`; strictly ascending; every value `< durationSeconds` |
| `chapters[].title` | non-empty string (Arabic) |

`description` stays verbatim and is no longer read by anything except the
schema. "1–2 sentences" is an authoring rule checked in review; the machine
checks are the ones in the table.

The cross-field chapter checks (ascending, below duration) live in the record
schema as a refinement, so they fail the build with the slug and index named.

**Chapters are parsed once, now**, from the timestamp lines of each Arabic
description and committed to `videos.json`. There is no runtime parser: a
future video's chapters are typed into the entry (or omitted).

### Parsed chapters (from the published descriptions)

| Slug | Chapters (`m:ss` → seconds) |
|---|---|
| `elm_alnaho` (151 s) | 0 مقدمة · 10 حركةٌ تغيّر المعنى · 44 ما هو علم النحو؟ · 65 كيف بدأ؟ · 98 مدارسه وأعلامه |
| `aqsam_kalam` (241 s) | 0 مقدمة · 13 ما هو الكلام؟ · 77 الاسم · 106 الفعل · 140 الحرف · 182 تطبيق |
| `alesm` (275 s) | 0 مقدمة · 38 الجرّ · 93 التنوين · 182 النداء · 200 دخول «أل» · 215 الإسناد |
| `aqsam_alfeal` (328 s) | 0 مقدمة · 30 الفعلُ من حيثُ الزمن · 98 الإعرابُ والبناءُ في الأفعال · 158 حروفُ الفعل · 217 الفعلُ في جملتِه · 268 الجمودُ والتصرّف |
| `horof_gar` (262 s) | 0 مقدمة · 14 ما حروفُ الجرِّ؟ · 49 عشرون حرفًا في بيتين · 123 عملُ حرفِ الجرِّ · 167 أنواعُ حروفِ الجرِّ |

### Draft summaries (final wording listed again in the PR)

| Slug | ar | en |
|---|---|---|
| `elm_alnaho` | حركةٌ واحدة في آخر الكلمة قد تقلب المعنى كله. نتعرّف في هذا الدرس على علم النحو وغايته، وكيف بدأ، وأشهر مدارسه وأعلامه وكتبه. | A single vowel mark at the end of a word can change a sentence's whole meaning. This lesson explains what Arabic grammar (nahw) is, what it is for, how it began, and its best-known schools, scholars and books. |
| `aqsam_kalam` | ما الكلام عند النحاة، وما الذي يجعل الجملة مفيدة؟ نشرح تعريف الكلام بقيوده الأربعة، ثم أقسامه الثلاثة: الاسم والفعل والحرف، مع تطبيق على نصٍّ لابن قتيبة. | What counts as speech (kalam) for the Arabic grammarians, and what makes a sentence meaningful? This lesson covers the definition of kalam and its four conditions, then its three parts — noun, verb and particle — with a worked example from Ibn Qutayba. |
| `alesm` | كيف تعرف أن الكلمة اسم؟ نتعرّف على علامات الاسم الخمس التي جمعها ابن مالك في بيت واحد: الجرّ والتنوين والنداء و«أل» والإسناد، وتكفي واحدة منها. | How do you know a word is a noun? This lesson covers the five signs of the noun that Ibn Malik gathered in one line of verse: the genitive, tanwin, the vocative, the definite article and predication — any one of them is enough. |
| `aqsam_alfeal` | فعلٌ واحد مثل «كَتَبَ» يجمع ستة أوصاف. نتعرّف على أقسام الفعل من حيث الزمن، والإعراب والبناء، والصحة والاعتلال، والتجرّد والزيادة، واللزوم والتعدّي، والجمود والتصرّف. | A single verb such as «كَتَبَ» carries six descriptions at once. This lesson covers the categories of the verb: tense, inflection, sound and weak roots, bare and augmented forms, transitivity, voice, and frozen versus conjugable verbs. |
| `horof_gar` | ما حروف الجر، وما معانيها؟ نتعرّف على بيتَي ابن مالك اللذين جمعا العشرين حرفًا، وعمل حرف الجر، وأنواعه الثلاثة: الأصلي والزائد والشبيه بالزائد. | What are the Arabic prepositions (huruf al-jarr) and what do they mean? This lesson covers Ibn Malik's two lines that gather all twenty, how a preposition governs its noun, and their three types: original, redundant and quasi-redundant. |

### `lib/videos/`

- `schema.ts` — adds `summary`, `chapters` and their validation.
- `loader.ts` — adds `getVideoIndex()`: entries in **manifest order**
  (`getAllSlugs()` filtered to slugs with a video), not JSON key order.
- `format.ts` (new, pure, import-free so the Client Component can use it):
  `formatIsoDuration(seconds)` → `PT4M1S` (`PT45S`, `PT1H2M3S`; zero units
  omitted), `formatClock`, `parseStartParam`, `videoEmbedUrl`.
- `structuredData.ts` (new, pure, no `server-only`):
  - `buildVideoObject({ slug, video, siteUrl })` → the JSON-LD object below.
  - URL helpers shared by page, JSON-LD and tests (`watchUrl`, `embedUrl`,
    `posterUrl`, `lessonId`).

## Routes

### Locale behaviour (Arabic-only pattern, as `i3rab`)

Both `/videos/<slug>` and `/en/videos/<slug>` are prerendered, exactly like
`/i3rab/<slug>` and `/en/i3rab/<slug>`.

| | `/videos/<slug>` | `/en/videos/<slug>` |
|---|---|---|
| Page chrome (header, labels, links) | Arabic | English |
| `<h1>` and summary | `title.ar`, `summary.ar` | the same Arabic text, marked `lang="ar" dir="rtl"` |
| Chapter titles | Arabic | Arabic, in a `lang="ar" dir="rtl"` list |
| Player | same iframe | same iframe |
| `<link rel="canonical">` | `/videos/<slug>` | `/videos/<slug>` (the Arabic URL) |
| hreflang | `ar` + `x-default` → Arabic URL | same; **no `en` alternate** |
| JSON-LD | VideoObject (Arabic) | the identical VideoObject (Arabic name/description, Arabic URLs) |
| Sitemap | listed | **not listed** |
| Internal links to lesson / quiz / index | `/lessons/…` | `/en/lessons/…` (next-intl `Link`) |

So `/en/videos/<slug>` exists for English-UI visitors arriving from
`/en/lessons/<slug>`, but tells search engines the Arabic URL is the one to
index. The same rules apply to `/videos` vs `/en/videos`.

`title.en` is used on the lesson-page facade and the `/en/videos` index cards;
`summary.en` only on the `/en/videos` index cards.

Unknown slugs (`/videos/nope`, or a lesson slug with no video) → `notFound()`,
the same path every other dynamic route here takes.

### Watch page — `app/[locale]/videos/[slug]/page.tsx`

Top to bottom, in a `max-w-3xl` column:

1. Back link → `/videos`.
2. **Player** — the first substantial element on the page, a 16:9
   `youtube-nocookie.com` iframe rendered in the server HTML (no facade, no
   click needed, **no `autoplay`**), `title`, `allowFullScreen`, the phase-1
   `allow` list, `referrerPolicy="strict-origin-when-cross-origin"`,
   `loading="eager"`.
3. `<h1>` — video title.
4. Meta line — duration (`4:01`) and publish date (locale-formatted at build).
5. Summary paragraph.
6. Chapter list (only when `chapters` exists) — `<ol>`, each row a timestamp
   and a title.
7. "Read the full lesson" card → `/lessons/<slug>` (lesson title), and — when
   `getLessonQuestionCount(slug) > 0`, the same gate the lesson page uses —
   the quiz button → `/quiz?lesson=<slug>`. The existing quiz card markup is
   extracted into a small shared server component so both pages render the same
   thing; the lesson page's output is unchanged.

Placing the player above the `<h1>` keeps it fully inside the first viewport at
390×800 and 1280×720; e2e asserts this on both projects.

### Chapter seeking — embed `start` parameter (chosen)

| Option | CSP impact | Verdict |
|---|---|---|
| **`start` param**: on click, set the iframe `src` to `…/embed/<id>?start=<n>&autoplay=1&rel=0` | none | **chosen** |
| IFrame Player API (`YT.Player#seekTo`) | needs `script-src https://www.youtube.com` (loads `iframe_api` + `www-widgetapi.js`) | rejected: loosens CSP, adds third-party script on a page that otherwise has none |
| Raw `postMessage` to the embed (`enablejsapi=1`) | none | rejected: undocumented wire protocol; breaks silently if YouTube changes it |

`start` is a documented embed parameter and needs no script. The cost is that
the player reloads on a chapter click (about a second). `autoplay=1` is added
only on a chapter click — a user gesture — never on page load.

**Each chapter is a real link**: `<a href="?t=83">`. This matters for two
reasons: Google's Clip markup requires a `url` on the same page path with a
time parameter, and the link works when opened in a new tab or shared.

- Click → handled in the browser: iframe `src` switches to `start=83`, the URL
  becomes `?t=83` via `history.replaceState`, focus moves to the player.
- Loading `/videos/<slug>?t=83` directly → the page is still the same static
  HTML; a client effect reads `location.search` and starts the player at 83 s
  (no autoplay). `t` is clamped to `0 … durationSeconds − 1`; anything else is
  ignored. The Worker does no extra work — the query string is never read on
  the server.
- Canonical stays the bare URL, so `?t=` variants do not become separate pages.

The player and chapter list are one Client Component
(`components/videos/VideoPlayer.tsx`) because they share the "current start"
state; it is server-rendered, so the iframe is in the initial HTML.

### Index — `app/[locale]/videos/page.tsx`

Title + subtitle, then a responsive grid (1 / 2 columns) of cards in manifest
order: self-hosted poster (16:9), title, duration badge, summary. The whole
card links to the watch page. No YouTube request is made from this page. No
JSON-LD here (structured data is on watch pages only).

### Navigation

The header already carries seven links (eight with pricing) and the mobile menu
mirrors it; an eighth competes for width at the `lg` breakpoint, especially in
English. **Not added to the header.** `/videos` is linked from:

- the lessons index (`/lessons`) — a text link beside the page heading
  ("شاهد الدروس بالفيديو" / "Watch the video lessons");
- every watch page (back link);
- every lesson page that has a video, indirectly, via its watch page;
- the footer "Product" column (one extra row, no layout change);
- the sitemap.

See open question 2 if you want it in the header anyway.

## Structured data (watch page only)

```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "@id": "https://alnahwalkafi.com/videos/aqsam_kalam#video",
  "name": "<title.ar>",
  "description": "<summary.ar>",
  "thumbnailUrl": ["https://alnahwalkafi.com/videos/aqsam_kalam.jpg"],
  "uploadDate": "2026-11-15T11:37:45-08:00",
  "duration": "PT4M1S",
  "embedUrl": "https://www.youtube-nocookie.com/embed/HsAQqiWgIhg",
  "url": "https://alnahwalkafi.com/videos/aqsam_kalam",
  "inLanguage": "ar",
  "isPartOf": { "@id": "https://alnahwalkafi.com/lessons/aqsam_kalam#lesson" },
  "publisher": { "@id": "https://alnahwalkafi.com/#organization" },
  "hasPart": [
    {
      "@type": "Clip",
      "name": "مقدمة",
      "startOffset": 0,
      "endOffset": 13,
      "url": "https://alnahwalkafi.com/videos/aqsam_kalam?t=0"
    }
  ]
}
```

- `endOffset` = next chapter's `startSeconds`; the last clip ends at
  `durationSeconds`. `hasPart` is omitted when there are no chapters.
- `embedUrl` is the exact origin+path of the iframe on the page.
- Serialized with the existing `serializeJsonLd` (escapes `<`).
- The watch page's Open Graph image is the same poster.

**Linking to the lesson by `@id` needs one line on the lesson page.** The
lesson's `LearningResource` currently has no `@id`. This phase adds
`'@id': '<lesson url>#lesson'` to that existing object (per-locale URL, so the
Arabic lesson gets `https://alnahwalkafi.com/lessons/<slug>#lesson`, which is
what the VideoObject references). No VideoObject is added to lesson pages.
This is the one lesson-page change beyond requirement 5 — see open question 3.

## Lesson page

`LessonVideo`'s caption row gains a second link, before "Watch on YouTube":
"صفحة الفيديو" / "Video page" → `/videos/<slug>` (next-intl `Link`, so `/en`
stays in `/en`). It is passed in as an optional `watchHref` prop; poster,
button, iframe and click behaviour are untouched.

## Sitemap — `scripts/generate-seo.mjs`

- `<urlset>` gains `xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"`.
- `/videos` and each `/videos/<slug>` are emitted with the existing
  `arabicOnly()` helper (Arabic URL only, `ar` + `x-default` alternates), in
  manifest order. Priority `0.6` index, `0.7` watch pages.
- Each watch-page `<url>` carries one `<video:video>`:

```xml
<video:video>
  <video:thumbnail_loc>https://alnahwalkafi.com/videos/aqsam_kalam.jpg</video:thumbnail_loc>
  <video:title>…title.ar…</video:title>
  <video:description>…summary.ar…</video:description>
  <video:player_loc>https://www.youtube-nocookie.com/embed/HsAQqiWgIhg</video:player_loc>
  <video:duration>241</video:duration>
  <video:publication_date>2026-11-15T11:37:45-08:00</video:publication_date>
</video:video>
```

- All text goes through the script's existing `xml()` escaper.
- The script keeps reading `content/videos.json` directly (it runs before
  `next build`, outside the TS toolchain). Validation stays in the loader: bad
  data still fails `next build` when the pages prerender. The script itself
  skips nothing and guesses nothing — it only refuses an entry whose slug or ID
  would be unsafe to interpolate.
- To make the entries unit-testable, the pure builders move to
  `scripts/seo/video-sitemap.mjs` (no file I/O, no side effects), imported by
  both `generate-seo.mjs` and vitest. `generate-seo.mjs` keeps its current
  behaviour and output for every existing URL.

## i18n

New `videos` namespace (`indexTitle`, `indexSubtitle`, `backToIndex`,
`chaptersTitle`, `duration`, `durationLabel`, `publishedOn`, `lessonCardTitle`,
`lessonCardButton`), plus `lessons.videoWatchPage`, `lessons.videosIndexLink`
and `footer.product.videos`. Both locale files, kept in parity by the existing
`i18n-parity` test.

## Tests

**vitest**
- schema: `summary` — missing locale, empty, 301 chars, contains URL / `www.` /
  hashtag / timestamp / newline; 300 chars accepted.
- schema: `chapters` — absent OK; single chapter; first not 0; equal or
  descending starts; start ≥ duration; negative / fractional start; empty title;
  unknown key.
- `formatIsoDuration`: 0-padding-free cases (`PT45S`, `PT4M1S`, `PT5M`,
  `PT1H`, `PT1H2M3S`), and rejection of non-positive / non-integer input.
- `buildVideoObject`: every required field; absolute URLs; `Clip` offsets incl.
  last-clip `endOffset = durationSeconds`; `hasPart` omitted without chapters;
  `isPartOf` matches the lesson `@id` helper; output for all five real entries
  is serializable and stable.
- loader: `getVideoIndex()` is in manifest order.
- sitemap builders: tag set and order, seconds duration, XML escaping of
  `& < > " '` in title/description, Arabic-only alternates, no `/en/videos` URL.
- real content: all five entries pass the new rules.

**Playwright** (`e2e/video-watch.spec.ts`, YouTube stubbed as in phase 1)
- watch page: exactly one `youtube-nocookie.com/embed/<id>` iframe **without
  any click**, no `autoplay` in its `src`, fully inside the first viewport on
  both projects.
- JSON-LD on the watch page parses; has `name`, `description`,
  `thumbnailUrl`, `uploadDate`, `duration`, `embedUrl`, `inLanguage: "ar"`;
  `hasPart` length equals the chapter count; the thumbnail URL returns 200.
- chapter click → iframe `src` contains `start=<n>`; URL gains `?t=<n>`;
  loading `?t=<n>` directly starts there.
- canonical on `/en/videos/<slug>` is the Arabic URL; no `en` hreflang.
- lesson pages (one with a video, one without): no `VideoObject` in any JSON-LD
  block; the lesson with a video links to its watch page; phase-1 facade
  assertions still pass unchanged.
- `/videos` lists every entry in manifest order, each linking to its watch
  page; no YouTube request.
- `sitemap.xml` contains `/videos`, each watch URL, and one `video:video` each.
- prerender-completeness sweep extended to `/videos/<slug>` and `/en/videos/<slug>`.

**Workers asset routing check.** `public/videos/*.jpg` and the new `/videos`
routes share a path prefix. Files and pages never collide by name
(`/videos/<slug>.jpg` vs `/videos/<slug>`), and `public/_headers` rules apply
only to asset responses, but `next start` cannot prove how the Workers ASSETS
binding treats the bare `/videos` path. Before the PR is opened this is checked
once against the real OpenNext bundle with `npm run preview` (local `wrangler`,
no deploy): `/videos`, `/videos/<slug>` and `/videos/<slug>.jpg` must all
resolve correctly. If `/videos` is intercepted by the asset layer, posters move
to `public/video-posters/` (with a matching `_headers` rule) rather than
renaming the route.

## Out of scope

Shorts, any homepage section, changes to the phase-1 facade's behaviour,
editing YouTube descriptions, `SeekToAction` markup (Clip covers key moments;
Google asks for one or the other), a header nav item, transcripts/captions.

## Files

New: `app/[locale]/videos/page.tsx`, `app/[locale]/videos/[slug]/page.tsx`,
`components/videos/VideoPlayer.tsx`,
`components/lessons/LessonQuizCard.tsx` (extracted, same markup),
`lib/videos/format.ts`, `lib/videos/structuredData.ts`,
`scripts/seo/video-sitemap.mjs`,
`test/videos-structured-data.test.ts`, `test/video-sitemap.test.ts`,
`e2e/video-watch.spec.ts`.

Changed: `content/videos.json`, `lib/videos/schema.ts`, `lib/videos/loader.ts`,
`components/lessons/LessonVideo.tsx` (one optional link),
`app/[locale]/lessons/[slug]/page.tsx` (link prop, `@id`, extracted quiz card),
`app/[locale]/lessons/page.tsx` (index link), `components/layout/Footer.tsx`,
`scripts/generate-seo.mjs`, `messages/ar.json`, `messages/en.json`, existing
video tests, `e2e/prerender-completeness.spec.ts`.

`next.config.ts` and `public/_headers` are not touched.

## Decisions (review of 2026-11-17)

1. **`/en/videos/<slug>`** — strict `i3rab` reading: Arabic title, summary and
   chapters on both locales; only page chrome translated. `summary.en` appears
   only on the `/en/videos` index cards.
2. **Header nav** — no header item; footer "Product" column + lessons index.
3. **Lesson `@id`** — added to the lesson page's `LearningResource`.
4. **Quiz card** — extracted to `components/lessons/LessonQuizCard.tsx`; the
   lesson page's rendered output is identical apart from the `@id` and the new
   watch-page link (verified by diffing `<main>` against a `main` build).
5. **`?t=` must not create indexable duplicates** — the canonical on every
   watch page is the URL without query params; e2e asserts it on the raw HTML of
   a `?t=` request, in the browser on a `?t=` load, and after a chapter click.

## Decisions (review of PR #64)

6. **Order** — the `/videos` index, the watch pages' static params and the
   sitemap use **lesson-tree order** (`content/lessons/tree.json` node order),
   so `elm_alnaho` comes first. A video whose lesson is not a tree node is
   appended in manifest order. Where this document says "manifest order", read
   "tree order".
7. **Arabic titles** — the trailing " | النحو الكافي" is stripped at render
   time (`displayTitleAr`) in the watch page `<h1>`, document title, iframe
   title, `/videos` cards, JSON-LD `name` and sitemap `video:title`. Other "|"
   segments ("| الدرس الأول") stay. `title.ar` in `videos.json` stays verbatim.
   The lesson-page facade (play-button label and iframe title) uses the same
   helper, so the suffix appears nowhere on the site.
8. **Arabic text on `/en` watch pages** — the `<h1>`, summary and chapter list
   carry `lang="ar" dir="rtl"` and the `font-arabic` (Cairo) stack. No font
   loading was added: the layout already declares and preloads Cairo on every
   page of both locales.

## Verification notes

- **Workers asset routing** (local `wrangler` against the OpenNext bundle):
  `/videos`, `/videos/<slug>`, `/videos/<slug>?t=77`, `/en/videos[/<slug>]` are
  served by the Worker as prerendered HTML; `/videos/<slug>.jpg` is served by
  the asset layer with the 7-day `_headers` cache rule; `/videos/` 308s to
  `/videos`; unknown slugs 404. Posters stay in `public/videos/`.
