# specs Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-10

## Active Technologies
- TypeScript 5, Next.js 16.2.3, React 19, next-intl 4.9.0 + framer-motion (to install), next/image (built-in) (main)
- N/A — all content is static JSON in message files (main)
- TypeScript 5, Next.js 16.2.3, React 19, next-intl 4.9.0 + @next/mdx + @mdx-js/loader + @mdx-js/react + @types/mdx (to install), @tailwindcss/typography (to install) (main)
- N/A — all content is static MDX files read at build time (main)

- **001-site-foundation**: Next.js 16 (App Router), TypeScript 5, React 19,
  Tailwind CSS v4 (CSS-first `@theme`), next-intl, next/font/google, lucide-react

## Key Conventions (from plan research.md)

- **Proxy file**: `proxy.ts` at root (not `middleware.ts` — renamed in Next.js 16)
- **Async params**: All layouts/pages must `await params` — params is a Promise in Next.js 16
- **Tailwind v4**: Tokens go in `@theme {}` inside `app/globals.css`. No `tailwind.config.ts` needed for colors/fonts.
- **RTL**: Use only logical Tailwind properties (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`). Physical direction properties (`pl-*`, `pr-*`, etc.) are forbidden.
- **i18n**: Arabic (`ar`) at `/` (no prefix); English (`en`) at `/en`. Both must use `await params` to get `locale`.

## Project Structure

```text
arabsyntax-web/
  app/[locale]/layout.tsx   ← locale shell (lang, dir, fonts, Header + Footer)
  app/[locale]/page.tsx     ← page content
  app/globals.css           ← Tailwind v4 @theme tokens (dark theme)
  proxy.ts                  ← next-intl locale middleware (export function proxy)
  i18n/routing.ts           ← locales + defaultLocale config
  i18n/request.ts           ← server-side message loading
  messages/ar.json          ← Arabic strings
  messages/en.json          ← English strings
  components/layout/        ← Header, Footer, LanguageSwitcher, MobileMenu
  components/ui/            ← Container, etc.
  lib/cn.ts                 ← clsx + tailwind-merge helper
```

## Commands

```bash
npm run dev    # Start dev server (Turbopack)
npm run build  # Production build
npm run lint   # ESLint
```

## Code Style

TypeScript strict mode. PascalCase components. camelCase utilities and message keys.
Nested message keys by feature: `nav.features`, `footer.legal.privacy`.

## Recent Changes
- main: Added TypeScript 5, Next.js 16.2.3, React 19, next-intl 4.9.0 + @next/mdx + @mdx-js/loader + @mdx-js/react + @types/mdx (to install), @tailwindcss/typography (to install)
- main: Added TypeScript 5, Next.js 16.2.3, React 19, next-intl 4.9.0 + framer-motion (to install), next/image (built-in)

- 001-site-foundation: Initial foundation plan — proxy.ts, i18n setup, Header, Footer, dark theme

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
