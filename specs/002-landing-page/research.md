# Research: Marketing Landing Page

**Branch**: `002-landing-page` | **Date**: 2026-04-10
**Feeds into**: plan.md Phase 1 design

---

## Decision 1: FAQ Implementation — Native `<details>/<summary>` (Server Component)

**Decision**: Implement the FAQ accordion using native HTML `<details>` and
`<summary>` elements. FAQ.tsx is a **Server Component**, not a Client Component.

**Rationale**: `<details>/<summary>` is a browser-native disclosure widget. It
handles expand/collapse without JavaScript, which means:
- No `'use client'` needed — stays a Server Component.
- Progressive enhancement out of the box (works even with JS disabled).
- Native accessibility: browsers expose the correct ARIA roles (`button` on
  `<summary>`, `aria-expanded` state managed by the browser).
- Keyboard-operable natively (Space/Enter toggles the `<details>` element when
  `<summary>` is focused).

The plan user described FAQ as "client component (needs state for open/closed)"
but this assumption is incorrect when using native HTML. Custom `<details>` styling
with Tailwind's `open:` variant handles the visual expand/collapse indicator.
Multiple items may be open simultaneously (no `<details name>` grouping needed
for the accordion-all-open behavior).

**Tailwind `open:` variant**: In Tailwind v4, `open:` targets elements with the
`open` attribute, which `<details>` receives automatically when expanded.
Example: `open:rotate-180` on the chevron icon.

**Alternatives considered**: React `useState` accordion (Client Component) —
rejected because it requires hydration overhead and adds complexity without
benefit over native `<details>`.

---

## Decision 2: Screenshots Section — Server Component, No Scroll Dots

**Decision**: Screenshots.tsx is a **Server Component**. Mobile layout uses
`overflow-x-auto snap-x snap-mandatory` for a touch-scroll carousel. No scroll
dots, no pagination. Desktop layout is a static grid.

**Rationale**: Scroll dots require tracking scroll position (`useEffect`,
`useState`) which forces a Client Component and adds hydration weight. The
native scroll snap provides a good enough mobile experience without JS.

**RTL scroll direction**: Tailwind v4's logical properties and the browser's
native RTL scroll behavior handle the scroll direction automatically when
`dir="rtl"` is set on `<html>`. No additional CSS is needed.

**Alternatives considered**: A Client Component carousel with dots (deferred to a
future iteration if analytics show engagement benefit).

---

## Decision 3: framer-motion — Install and Gate on prefers-reduced-motion

**Decision**: Install `framer-motion` (latest stable). Apply scroll-reveal
animations to section headings and cards. All animations MUST be gated on
`useReducedMotion()`. Framer-motion is imported only in the components that
use it. Those components must use `'use client'`.

**Rationale**: The constitution mandates framer-motion for meaningful animations
and requires prefers-reduced-motion gating. For the landing page, subtle
scroll-in animations (opacity + translateY) on section entry improve perceived
polish without harming LCP (hero is priority-loaded, hero text is not animated).

**Which components use framer-motion**:
- `components/ui/AnimatedSection.tsx` — a tiny `'use client'` wrapper that
  applies a fade-up animation to its children. Used by Features, Pricing,
  Audiences, and FAQ sections.
- The Hero, HowItWorks, Screenshots, and FinalCTA sections do NOT use
  framer-motion; they render statically.

**Animation spec**:
- `initial`: `{ opacity: 0, y: 20 }`
- `animate`: `{ opacity: 1, y: 0 }`
- `transition`: `{ duration: 0.5, ease: 'easeOut' }`
- When `useReducedMotion()` returns `true`: no animation applied (render
  immediately at final state).

**Alternatives considered**: CSS `@keyframes` with `prefers-reduced-motion`
media query (valid, but framer-motion is already mandated by the constitution and
provides better compositional control).

---

## Decision 4: Hero Two-Column RTL Layout

**Decision**: Use standard Tailwind flex (`flex flex-col lg:flex-row`). Do NOT
use `rtl:flex-row-reverse` or explicit `ltr:` / `rtl:` variants for the
column order.

**Rationale**: In a flex-row container under `dir="rtl"`, browsers render flex
items from right to left. The first child (text) appears on the right (the start
side in RTL), and the second child (phone mockup) appears on the left (the end
side). In LTR, the order reverses naturally. This is the correct layout for
both locales without any direction-specific overrides.

**All spacing uses logical properties**: `ps-*`, `pe-*`, `ms-*`, `me-*`, etc.

**Alternatives considered**: Using `order-first`/`order-last` with `rtl:` variant
(unnecessary complexity when flex-row direction is already correct).

---

## Decision 5: PlayStoreBadge — Server Component with Locale Prop

**Decision**: `PlayStoreBadge.tsx` is a **Server Component** that accepts a
`locale: string` prop. It renders the locale-appropriate badge image:
- `public/badges/google-play-ar.png` for Arabic
- `public/badges/google-play-en.png` for English

**Rationale**: Hero and FinalCTA are Server Components. Receiving locale as a prop
avoids importing a client hook. The parent (`app/[locale]/page.tsx` or any
section component) already has the locale from `await params`.

**Badge asset strategy**: Use a single English badge initially with a TODO
comment for the locale-specific Arabic badge. Official Google Play badge
download is from the Android brand guidelines page. Dimensions: 564 × 168 px
(standard badge size). Both badges use explicit `width` and `height` per the
constitution.

**Alternatives considered**: `useLocale()` hook (Client Component) — rejected
because it forces hydration for a purely static rendering concern.

---

## Decision 6: next-intl v4 Message Namespacing for Landing

**Decision**: Add a top-level `landing` namespace to both message files, with
nested sub-namespaces per section: `landing.hero`, `landing.features`,
`landing.howItWorks`, `landing.screenshots`, `landing.pricing`,
`landing.audiences`, `landing.faq`, `landing.finalCta`.

**Rationale**: next-intl v4 is installed (v4.9.0). The `getTranslations('landing.hero')`
call in Server Components, and `useTranslations('landing.faq')` in Client Components,
both work with dot-separated namespace paths. This keeps message files organized
and allows individual sections to load only the keys they need.

**Key naming**: camelCase, nested. Example: `landing.features.cards.audioLessons.title`.

**Alternatives considered**: Flat keys (rejected — leads to naming collisions and
unreadable message files at scale).

---

## Decision 7: AppStoreBadge — Scaffolded but Hidden

**Decision**: Create `components/ui/AppStoreBadge.tsx` but render `null` by
default (or wrap in `{false && <AppStoreBadge />}`). No feature flag system.

**Rationale**: iOS is out of scope for v1 (constitution, Scope Discipline
principle). The component is scaffolded now so future developers know where to add
it, but it must not be visible to users until iOS launches.

**Alternatives considered**: `NEXT_PUBLIC_SHOW_APP_STORE_BADGE` env flag
(overkill — a simple `null` return or comment is sufficient for a component that
will be enabled manually in a future feature).

---

## Decision 8: Pricing Placeholder Values

**Decision**: Pricing tiers use Egyptian Pound (ج.م) placeholder amounts with
inline TODO comments in the message files. The yearly tier is highlighted as
"الأكثر شيوعاً" / "Most popular".

**Tier structure**:
- Free: Core lessons, no time limit
- Monthly: Full access, 39 ج.م / month (placeholder)
- Yearly: Full access, 299 ج.م / year (placeholder) — highlighted
- Lifetime: Full access, 499 ج.م one-time (placeholder)

**All amounts are placeholders** pending final pricing decision by the project
owner. Each placeholder has a TODO comment in the message file.

**Alternatives considered**: No pricing section until final values are confirmed
(rejected — the layout and structure should be built now; amounts are swapped
in message files with no code change).
