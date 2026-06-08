# Design System

Single source of truth: **`app/globals.css` `@theme`**. Components reference tokens
only — raw color literals are blocked by `npm run lint` (see [Governance](#governance)).

## Principles
1. **Tokens only.** No `#hex`, `rgb()`, `hsl()` in `components/**` or `app/**/*.tsx`.
2. **Text tokens are solid composited hex**, never raw alpha over a background — alpha
   over an unknown/transparent surface was the original faint-text bug.
3. **Theme-aware.** Components use semantic tokens. Dark values are the fallback; light
   values override the same tokens via `html[data-resolved-theme="light"]`.
4. **Type & spacing reuse Tailwind v4's built-in scale** — no parallel `--text-*`/`--space-*`
   tokens (that would be a drift source).

## Color tokens (dark)

| Token | Value | Usage | Contrast |
|---|---|---|---|
| `--color-background` | `#0D1B2A` | page | — |
| `--color-surface` | `#1B263B` | cards, nav, example blocks | — |
| `--color-surface-elevated` | `#243049` | raised surfaces | — |
| `--color-border` | `#2A3A54` | hairlines | — |
| `--color-text` | `#E0E1DD` | headings / strong | 13.24:1 |
| `--color-text-body` | `#A1A6A7` | paragraphs (prose body) | 7.04:1 |
| `--color-text-secondary` | `#D1D5DB` | metadata / labels | 11.80:1 |
| `--color-text-muted` | `#9298A0` | captions, transliteration | 5.98 page / 5.21 surface |
| `--color-primary` | `#14B8A6` | links, CTA, active nav | 6.99:1 |
| `--color-primary-fg` | `#0D1B2A` | text on primary | 6.99:1 |
| `--color-accent` / `-teal` / `-gold` | `#F59E0B` / `#4DB6AC` / `#FFD700` | accents | 8.1 / 7.1 / 12.4 |
| `--color-quote-quran-bg` / `-text` / `-border` | `#0E2E25` / `#D5EAD9` / `#7FBFA3` | Qur'an verse block | **11.56:1** |
| `--color-quote-text` / `-border` | `#8C9295` / `#93C5FD` | plain quote | 5.50:1 |
| `--color-hl-{purple,green,amber,blue}-{bg,border,text}` | see `@theme` | highlight callouts | 9.3–11.5:1 |

`muted` was deliberately raised from the app's `#E0E1DD@50%` (4.22:1, fails AA on real
transliteration content) to a solid `#9298A0`. Matching the app is the baseline; where its
literal value fails WCAG AA, AA wins.

## Type & spacing
Use Tailwind's built-in scales directly. Conventions in use:
- **Lesson body**: rendered inside `.prose` (`--tw-prose-body: var(--color-text-body)`,
  headings → `--color-text`), `line-height: 1.7` (1.8 for RTL).
- **Headings**: page H1 `text-3xl lg:text-4xl font-bold`; section H2 `text-2xl font-bold`.
- **Captions / transliteration**: `text-sm` / `text-xs`.
- **Spacing**: section rhythm `my-6`; block padding `p-5`; Qur'an block `px-4 py-[18px]`.

## Component catalog
Scope = components the site actually renders. No speculative components.

### Layout primitives
- **`Container`** — `max-w-7xl` + responsive padding. No color.
- **`Card`** — `bg-surface border-border rounded-2xl`. State: `hover:border-primary` (lesson cards).
- **`SectionHeading`** — H2 `text-text`, subtitle `text-text-muted`.

### Header / nav
- **`Header`** — `bg-background border-border`. Links `text-text-muted hover:text-primary`;
  skip-link `bg-primary text-primary-fg`. **`MobileMenu`** panel `bg-surface-elevated border-border`.

### Buttons / links
- **Nav link**: `text-text-muted hover:text-primary`.
- **Back / inline link**: `text-primary hover:underline`.
- **Primary CTA**: `bg-primary text-primary-fg hover:bg-primary-hover`.
- **Store badges** (`AppStoreBadge`, `PlayStoreBadge`): image assets, no color tokens.

### Lesson section renderers (`components/lessons/LessonSections.tsx`)
Locale-aware: `/ar` Arabic only; `/en` English + transliteration (`text-text-muted`).

| Type | Tokens / treatment |
|---|---|
| `paragraph` | prose body (`--color-text-body`), `whitespace-pre-line` |
| `heading` | `text-2xl font-bold text-text` |
| `question` | `font-semibold text-primary` |
| `highlight` | purple callout: `bg-hl-purple-bg border-hl-purple-border text-hl-purple-text`; label badge `bg-hl-purple-border/30`. (green/amber/blue palettes reserved for future note/tip/info; data currently has one highlight kind.) |
| `quote` (Qur'an) | `bg-quote-quran-bg text-quote-quran-text border-quote-quran-border/30 rounded-[14px]`; inline caption `— Qurʼan s:a · Translation: …` |
| `quote` (plain/poetry) | `border-s-4 border-quote-border` (logical inline-start, RTL-safe), `italic text-quote-text` |
| `list` | prose `ul`, `text-text-muted` bullets |
| `example` | `bg-surface/50 border-border`; AR sentences `text-text` (underlined → `font-bold underline decoration-primary`); EN transliteration `text-text-muted italic` |
| `table` | `border-border`, header `bg-surface text-text`, cells `text-text`, transliteration `text-text-muted` |

## Governance
`npm run lint` runs ESLint **and** `scripts/check-tokens.mjs`, which fails on any
`#hex` / `rgb()` / `hsl()` in `components/**` and `app/**/*.tsx`. Token definitions
(`globals.css`) and `.ts` config (`manifest.ts`, `sitemap.ts`) are exempt.

## Theme behavior
The site supports **System / Light / Dark** from the header theme menu.

- Preference is stored in `localStorage` under `arabsyntax-theme`.
- `lib/theme.ts` provides the pre-hydration script that sets
  `html[data-theme]`, `html[data-resolved-theme]`, and `color-scheme` before React
  hydrates, avoiding a visible theme flash.
- The root layout does **not** read cookies for theme selection, preserving static/SSG
  behavior.
- The browser `theme-color` meta tag is synchronized from `--color-background`.

## Color tokens (light)

| Token | Value | Usage |
|---|---|---|
| `--color-background` | `#F7FAFC` | page |
| `--color-surface` | `#FFFFFF` | cards, nav, example blocks |
| `--color-surface-elevated` | `#EEF4F8` | raised surfaces |
| `--color-border` | `#D8E3EA` | hairlines |
| `--color-text` | `#0F172A` | headings / strong |
| `--color-text-body` | `#334155` | paragraphs |
| `--color-text-secondary` | `#475569` | metadata / labels |
| `--color-text-muted` | `#64748B` | captions, transliteration |
| `--color-primary` | `#0F766E` | links, CTA, active nav |
| `--color-primary-hover` | `#115E59` | hover state |
| `--color-primary-fg` | `#FFFFFF` | text on primary |
| `--color-quote-quran-bg` / `-text` / `-border` | `#E8F5EE` / `#0E3328` / `#2D7A62` | Qur'an verse block |
