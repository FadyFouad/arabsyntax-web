# Research: Legal Pages

**Feature**: 003-legal-pages | **Date**: 2026-04-10

---

## Decision 1: MDX Rendering Library — @next/mdx (NOT next-mdx-remote)

**Decision**: Use `@next/mdx` (official Next.js package) to render legal MDX files.

**Rationale**: `next-mdx-remote` was archived by Hashicorp on **2026-04-09** (one day before this feature was planned) and is no longer maintained. Its maintained fork `next-mdx-remote-client` is a third-party package. `@next/mdx` is the official Vercel-maintained solution, integrates natively with the App Router, and renders MDX as Server Components by default.

**Alternatives considered**:
- `next-mdx-remote` — REJECTED: archived and unmaintained.
- `next-mdx-remote-client` — REJECTED: third-party fork; adds dependency risk for static content that does not need runtime evaluation.
- Raw `fs` + `remark`/`rehype` pipeline — REJECTED: significant boilerplate for two static files per locale.

**Setup**:
1. Install: `npm install @next/mdx @mdx-js/loader @mdx-js/react @types/mdx`
2. Wrap `next.config.ts` with `withMDX` alongside the existing `withNextIntl`:
   ```typescript
   import createMDX from '@next/mdx';
   const withMDX = createMDX({ extension: /\.mdx?$/ });
   export default withMDX(withNextIntl(nextConfig));
   ```
3. Add `pageExtensions: ['ts', 'tsx', 'mdx']` to `nextConfig`.
4. Create `mdx-components.tsx` at the project root (required by @next/mdx).

**Frontmatter**: @next/mdx does not parse YAML frontmatter. Use JavaScript exports at the top of each MDX file:
```mdx
export const frontmatter = {
  title: 'سياسة الخصوصية',
  lastUpdated: '2026-04-10',
  description: '...',
};
```
The page component imports both the default MDX component and the named `frontmatter` export.

---

## Decision 2: @tailwindcss/typography with Tailwind v4

**Decision**: Install `@tailwindcss/typography` and register it via `@plugin` in `globals.css`. Customize prose colors using CSS custom properties in `@layer components`. No `tailwind.config.ts` changes needed.

**Rationale**: Tailwind v4 uses a CSS-first approach. Plugins are registered with `@plugin "package-name"` directly in the CSS file. Prose color overrides use the `--tw-prose-*` CSS variables (already supported by the typography plugin) set to point to the project's existing color tokens.

**Registration** (in `app/globals.css`, after `@import "tailwindcss"`):
```css
@plugin "@tailwindcss/typography";
```

**Dark theme customization** (in `@layer components`):
```css
@layer components {
  .prose {
    --tw-prose-body: var(--color-text);
    --tw-prose-headings: var(--color-text);
    --tw-prose-links: var(--color-primary);
    --tw-prose-bold: var(--color-text);
    --tw-prose-quotes: var(--color-text-muted);
    --tw-prose-counters: var(--color-text-muted);
    --tw-prose-bullets: var(--color-text-muted);
    --tw-prose-hr: var(--color-border);
    --tw-prose-code: var(--color-primary);
    line-height: 1.7;
  }
  [dir="rtl"] .prose {
    line-height: 1.8;
  }
}
```

**RTL**: The typography plugin already uses logical CSS properties internally. No `prose-rtl` variant exists, but `[dir="rtl"] .prose` CSS overrides line-height for Arabic. The `<html dir="rtl">` set by the locale layout causes the browser to flip list bullets and paragraph alignment automatically.

**Alternatives considered**:
- Manual prose CSS without the plugin — REJECTED: significant effort to replicate heading hierarchy, list, blockquote, and code styling from scratch.
- `tailwind.config.ts` typography config — REJECTED: conflicts with Tailwind v4 CSS-first approach; constitution forbids new config entries.

---

## Decision 3: Frontmatter & "Last Updated" Date — JS Exports in MDX

**Decision**: Each MDX file exports a `frontmatter` const object containing `title`, `lastUpdated` (ISO date string), and `description`. The page component imports this export alongside the MDX content.

**Rationale**: This is the idiomatic @next/mdx pattern. Updating the "Last updated" date requires editing only one MDX file (the source of truth), satisfying FR-008. The page imports the frontmatter and passes it to `LegalLayout`.

**"Last updated" label**: The UI label ("آخر تحديث" / "Last updated") is added to the `messages/{locale}.json` files under a `legal` namespace, satisfying the no-hardcoded-strings rule.

---

## Decision 4: Static Imports, One per Locale

**Decision**: In each page component (`privacy/page.tsx`, `terms/page.tsx`), statically import both locale variants and select by `locale` param.

```typescript
import ContentAr, { frontmatter as fmAr } from '@/content/legal/privacy.ar.mdx';
import ContentEn, { frontmatter as fmEn } from '@/content/legal/privacy.en.mdx';

const Content = locale === 'ar' ? ContentAr : ContentEn;
const fm = locale === 'ar' ? fmAr : fmEn;
```

**Rationale**: Dynamic `await import()` with template literals is unreliable in Next.js static builds. Static imports are tree-shaken and compile-time verified. With only 2 locales × 2 documents = 4 files, the duplication is minimal.

---

## Decision 5: LegalLayout — Server Component with no 'use client'

**Decision**: `components/layout/LegalLayout.tsx` is a pure Server Component. It wraps MDX content in a `<article className="prose max-w-prose mx-auto px-4 sm:px-6 lg:px-8 py-12">` and renders the `<h1>` and "Last updated" line above the content. No interactive elements.

**Rationale**: Legal pages are read-only documents. No state, no animations, no interactivity is needed. This is the simplest valid implementation.

---

## Decision 6: No noindex — Legal Pages Must Be Publicly Indexable

**Decision**: Legal pages do NOT set `robots: { index: false }` in metadata. They must be publicly crawlable so Google Play Console can verify the privacy policy URL.

**Rationale**: FR-003 and FR-014 both require public accessibility. `noindex` would prevent Google Play Console from verifying the URL. Standard practice for privacy policies is to allow indexing.
