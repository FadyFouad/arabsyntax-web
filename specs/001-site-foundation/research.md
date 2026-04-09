# Research: Site Foundation — Bilingual Shell

**Branch**: `001-site-foundation` | **Date**: 2026-04-10
**Feeds into**: plan.md Phase 1 design

---

## Decision 1: Middleware File Convention (Next.js 16 Breaking Change)

**Decision**: Use `proxy.ts` at the project root, not `middleware.ts`.

**Rationale**: Next.js 16 renamed the middleware file convention from `middleware`
to `proxy`. The old name is deprecated and will be removed in a future version.
The exported function must also be renamed: `export function proxy(request)` instead
of `export function middleware(request)`.

**Impact on next-intl**: next-intl's middleware function is imported and
re-exported. The filename and export name change; the imported function itself
does not change. `proxy.ts` will look like:

```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export const proxy = createMiddleware(routing);

export const config = { matcher: ['/', '/(ar|en)/:path*', '/((?!_next|.*\\..*).*)'] };
```

**Alternatives considered**: Keep `middleware.ts` (backward compatible but
deprecated — would generate warnings and is not forward-compatible with
Next.js 17+).

---

## Decision 2: Tailwind Configuration (v4 CSS-First, Not tailwind.config.ts)

**Decision**: All theme tokens are defined in `app/globals.css` using the `@theme`
directive. There is no `tailwind.config.ts` file for color/font configuration.

**Rationale**: The project has Tailwind CSS v4 installed (`tailwindcss@^4`,
`@tailwindcss/postcss@^4`). Tailwind v4 uses a CSS-first configuration model.
Colors, fonts, and other design tokens are declared inside an `@theme` block in
the global CSS file. Tailwind automatically generates `bg-*`, `text-*`,
`border-*` utilities from `--color-*` custom properties defined in `@theme`.

The plan input described `tailwind.config.ts` with `theme.extend.colors`, which
is the Tailwind v3 API. Tailwind v4 replaces this with CSS-native configuration.

**Token naming**: The `design-tokens.md` file uses `--color-background`,
`--color-surface`, `--color-primary`, etc. These produce utilities `bg-background`,
`bg-surface`, `text-text`, `text-text-muted`, `border-border`, etc. — matching
what components will use.

**Font families in Tailwind v4**: Also declared in `@theme`:
```css
@theme {
  --font-arabic: var(--font-cairo), system-ui, sans-serif;
  --font-english: var(--font-inter), system-ui, sans-serif;
}
```
This makes `font-arabic` and `font-english` Tailwind utilities available.

**Alternatives considered**: Create a `tailwind.config.ts` alongside the CSS
configuration — possible in Tailwind v4 but redundant and adds confusion. CSS-only
is the canonical Tailwind v4 approach.

---

## Decision 3: Async Params in Next.js 16

**Decision**: All layout and page components that access `params` must use
`await params` — params is a Promise in Next.js 16.

**Rationale**: Next.js 16 made route params asynchronous. The `LayoutProps`
and `PageProps` global TypeScript helpers reflect this. Any component that reads
`params.locale` must be async and await the params object first:

```tsx
export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  ...
}
```

**Alternatives considered**: None — this is a non-negotiable Next.js 16 API change.

---

## Decision 4: next-intl Version and Setup

**Decision**: Install `next-intl` (latest stable — 3.x or 4.x as of April 2026).
Use the App Router `[locale]` segment pattern with `localePrefix: "as-needed"`.

**Rationale**: `next-intl` is the constitution-mandated i18n library. The App
Router pattern places all pages under `app/[locale]/`. The next-intl middleware
(now exported from `proxy.ts`) handles locale detection and path rewriting.

**Key files:**
- `i18n/routing.ts` — defines `locales: ['ar', 'en']`, `defaultLocale: 'ar'`,
  `localePrefix: 'as-needed'`.
- `i18n/request.ts` — loads the correct messages file per request (server-side).
- `proxy.ts` — exports `proxy` function from `createMiddleware(routing)`.

**`usePathname` for LanguageSwitcher**: The `LanguageSwitcher` client component
uses next-intl's `usePathname` (not Next.js's) to get the path without the locale
prefix, then constructs the alternate-locale URL. next-intl's `Link` component
from `next-intl/navigation` handles locale injection automatically.

**Alternatives considered**: Build a custom i18n solution (rejected — adds
maintenance burden). Use `paraglide-next` (rejected — not in constitution stack).

---

## Decision 5: Mobile Navigation Pattern

**Decision**: Disclosure pattern — a hamburger `<button>` toggles an
absolutely-positioned `<nav>` menu below the header bar. The toggle button and
menu are in the same `LanguageSwitcher`-sibling Client Component (`MobileMenu`).

**Rationale**: Simplest keyboard-accessible pattern. No animation needed for
the foundation. Menu opens inline below the header (not a slide-out drawer) to
avoid z-index complexity and to work correctly in both RTL and LTR without
directional CSS hacks. `aria-expanded` on the toggle button and `aria-controls`
linking to the menu `<div>` satisfy WCAG 2.1.

**Icon flip**: The close (`X`) icon needs no flip. The hamburger (`Menu`) icon
needs no flip. Any chevron used inside the nav does need `rtl:-scale-x-100`.

**Alternatives considered**: Slide-out drawer (more complex, requires portal or
absolute positioning relative to the viewport — deferred to later iteration).

---

## Decision 6: Text Logo (No SVG Yet)

**Decision**: Render the logo as a two-line text element: `ArabSyntax` (small,
English, always rendered as brand name) and `النحو العربي` (below, Arabic).
Swap to an SVG when the asset is ready.

**Rationale**: The spec assumption explicitly allows a text-only logotype during
foundation development. A text logo avoids a missing-image placeholder and
renders correctly in both locales without any direction-specific handling.

**Alternatives considered**: Placeholder image with `next/image` — requires a
real file in `public/` and alt text management; unnecessary for foundation phase.

---

## Decision 7: `generateStaticParams` in `[locale]` Layout

**Decision**: Export `generateStaticParams` from `app/[locale]/layout.tsx`
returning `[{ locale: 'ar' }, { locale: 'en' }]`.

**Rationale**: Statically pre-renders both locale variants at build time.
Satisfies the performance constitution requirement (no runtime locale detection
overhead after deployment). Required for correct Vercel static deployment.

**Alternatives considered**: Dynamic rendering (deferred locale resolution at
request time) — unnecessary for a marketing site with static content.
