# Implementation Plan: Legal Pages

**Branch**: `003-legal-pages` | **Date**: 2026-04-10
**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Summary

Build the Privacy Policy and Terms of Service pages inside the existing bilingual
shell. Content lives in four MDX files (`content/legal/`). Pages are rendered by
a shared `LegalLayout` component with `@tailwindcss/typography` prose styling
customized for the dark theme. Both pages are available at `/privacy`, `/en/privacy`,
`/terms`, and `/en/terms`. Footer links are wired to locale-aware routes.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.3, React 19, next-intl 4.9.0
**Primary Dependencies**: @next/mdx + @mdx-js/loader + @mdx-js/react + @types/mdx (to install), @tailwindcss/typography (to install)
**Storage**: N/A — all content is static MDX files read at build time
**Testing**: Manual per quickstart.md; Lighthouse Accessibility ≥ 95
**Target Platform**: Vercel (statically generated via `generateStaticParams`)
**Project Type**: Web application — static legal content pages
**Performance Goals**: No specific LCP target (text-only pages); Lighthouse Accessibility 95+
**Constraints**: RTL logical properties only; no hardcoded strings; Server Components by default; `next-mdx-remote` is ARCHIVED — use `@next/mdx` instead
**Scale/Scope**: 2 page components, 1 layout component, 4 MDX content files, 2 message extensions, 2 config file updates — approximately 11 new or modified files

## Constitution Check

*GATE: Must pass before implementation begins. Re-check after Phase 1 design.*

| Gate | Rule | Status |
|------|------|--------|
| RTL discipline | LegalLayout uses logical Tailwind properties only; `[dir="rtl"] .prose` CSS for line-height override | ✅ Research Decision 5 |
| Server Components default | LegalLayout and both page components are Server Components; no interactivity needed | ✅ Research Decision 5 |
| framer-motion gated | No animations on legal pages — no framer-motion used | ✅ N/A |
| No hardcoded strings | "Last updated" label in `legal.*` message namespace; page titles from MDX frontmatter | ✅ Research Decision 3 |
| No `<img>` tags | No images on legal pages | ✅ N/A |
| Accessibility 95+ | Heading hierarchy semantic (h1 in LegalLayout, h2+ in MDX); prose contrast via color tokens | ✅ Enforced in LegalLayout |
| Tailwind v4 | `@plugin "@tailwindcss/typography"` in globals.css; prose colors via `--tw-prose-*` CSS vars; no tailwind.config.ts changes | ✅ Research Decision 2 |
| Font/color tokens | Prose overrides use `var(--color-text)`, `var(--color-primary)`, etc. — no hardcoded hex | ✅ Research Decision 2 |
| noindex NOT set | Legal pages must be publicly indexable for Google Play Console | ✅ Research Decision 6 |
| next-mdx-remote archived | Use `@next/mdx` (official) instead | ✅ Research Decision 1 |

**Post-Phase-1 re-check**: All gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/003-legal-pages/
├── plan.md              ← this file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

### Source Code Changes (from arabsyntax-web/ root)

```text
# Install
@next/mdx @mdx-js/loader @mdx-js/react @types/mdx   ← MDX rendering (official)
@tailwindcss/typography                               ← prose styling plugin

# Config updates
next.config.ts              ← wrap with withMDX; add pageExtensions: ['ts','tsx','mdx']
mdx-components.tsx          ← required @next/mdx root file (empty components map)

# New content
content/legal/
  privacy.ar.mdx            ← Arabic privacy policy (frontmatter export + 12 sections)
  privacy.en.mdx            ← English privacy policy
  terms.ar.mdx              ← Arabic terms of service (frontmatter export + 12 sections)
  terms.en.mdx              ← English terms of service

# New pages
app/[locale]/privacy/page.tsx   ← imports both locale MDX files; selects by locale
app/[locale]/terms/page.tsx     ← imports both locale MDX files; selects by locale

# New component
components/layout/LegalLayout.tsx  ← h1, last-updated line, prose <article> wrapper

# Styles
app/globals.css             ← @plugin "@tailwindcss/typography"; prose dark-theme overrides

# Messages
messages/ar.json            ← add legal.lastUpdated ("آخر تحديث"), legal.privacyTitle, legal.termsTitle
messages/en.json            ← add legal.lastUpdated ("Last updated"), legal.privacyTitle, legal.termsTitle

# Modified
components/layout/Footer.tsx  ← wire privacy and terms links using next-intl Link
```

## Complexity Tracking

No constitution violations.

---

## Phase 0: Research

*Complete. See [research.md](research.md).*

Key decisions:
- MDX: use `@next/mdx` — next-mdx-remote is ARCHIVED as of 2026-04-09
- Frontmatter: JavaScript exports in MDX files (`export const frontmatter = {...}`)
- Static imports: import all locale MDX files at build time; select by `locale` at runtime
- Typography: `@plugin "@tailwindcss/typography"` + `--tw-prose-*` CSS variable overrides in `@layer components`
- RTL: `[dir="rtl"] .prose { line-height: 1.8; }` in `@layer components`; no `prose-rtl` variant needed
- No noindex: legal pages must be publicly crawlable for Google Play Console

---

## Phase 1: Design & Contracts

*Complete. See artifacts below.*

- **Data model**: [data-model.md](data-model.md) — document registry, frontmatter schema, section structure, LegalLayout interface
- **Verification guide**: [quickstart.md](quickstart.md) — 11 checks

**No contracts/ directory**: This feature exposes no external API. The MDX frontmatter schema and component props are documented in data-model.md.

**Post-Phase-1 Constitution Check re-evaluation**: All gates still pass. No hardcoded strings, no physical CSS, Server Components throughout.
