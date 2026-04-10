# Implementation Plan: Support Page with Contact Form

**Branch**: `004-support-page` | **Date**: 2026-04-10
**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Summary

Build the Support page at `/support` (Arabic) and `/en/support` (English) inside
the existing bilingual shell. The page contains a contact form (react-hook-form +
zod, submitted via a Server Action to Resend), a fallback direct email link, and
the existing FAQ content reused from `landing.faq` message keys. Spam protection
uses a honeypot field and Upstash Redis rate limiting (5 per hour per IP), with
an in-memory fallback for local development.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.3, React 19, next-intl 4.9.0
**Primary Dependencies**: zod (to install), react-hook-form + @hookform/resolvers (to install), resend (to install), @upstash/ratelimit + @upstash/redis (to install)
**Storage**: No persistence — submissions are delivered by email and discarded. Rate-limit state stored in Upstash Redis (HTTP key-value, serverless-compatible).
**Testing**: Manual per quickstart.md; Lighthouse Accessibility ≥ 95
**Target Platform**: Netlify (serverless functions — no persistent server state)
**Project Type**: Web application — interactive contact form + static FAQ
**Performance Goals**: No specific LCP target (text-only page); Lighthouse Accessibility 95+
**Constraints**: RTL logical properties only; no hardcoded strings; Vercel KV is FORBIDDEN (deployment is Netlify); in-memory rate limiter as local-dev fallback only
**Scale/Scope**: 1 page, 1 client form component, 1 Server Action, 3 lib utilities, message extension, env vars — approximately 10 new or modified files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Rule | Status |
|------|------|--------|
| RTL discipline | ContactForm inputs use `text-start`; submit button aligned `ms-auto`; form layout uses logical properties | ✅ Research Decision 4 |
| Server Components default | SupportPage is a Server Component; ContactForm is `'use client'` justified (react-hook-form hooks + useTranslations) | ✅ Justified |
| No hardcoded strings | All labels, placeholders, errors, confirmations sourced from `support.*` message keys | ✅ Research Decision 3 |
| Design system discipline | Inputs `rounded-lg`; submit button `rounded-xl`; colors via theme utilities; no hex | ✅ Constitution §II |
| Accessibility 95+ | Every input has `<label>`; errors via `aria-describedby`; `aria-live="polite"` for error region; `role="status"` for success; keyboard-only operable | ✅ Constitution §III |
| CAPTCHA excluded | Honeypot + rate limit (explicitly allowed in §VI) | ✅ Constitution §VI |
| Netlify compatibility | Upstash Redis via HTTP REST — no persistent connections; works on Netlify | ✅ Research Decision 2 |
| Vercel KV forbidden | Deployment is Netlify; Vercel KV is platform-locked | ✅ Research Decision 2 |
| framer-motion gated | No animations on support page — framer-motion not used | ✅ N/A |
| No `<img>` tags | No images on this page | ✅ N/A |
| i18n routes | `/support` (ar) and `/en/support` (en) via `app/[locale]/support/page.tsx` | ✅ Constitution §I |
| SEO completeness | `generateMetadata` with title, description, canonical, hreflang | ✅ Constitution §V |

**Post-Phase-1 re-check**: All gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/004-support-page/
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
zod                                  ← validation schema (shared client + server)
react-hook-form @hookform/resolvers  ← form state and client validation
resend                               ← transactional email
@upstash/ratelimit @upstash/redis   ← rate limiting

# New page
app/[locale]/support/page.tsx        ← Server Component, imports ContactForm

# New component
components/forms/ContactForm.tsx     ← 'use client'; react-hook-form + zod resolver

# Server Action
app/actions/contact.ts              ← 'use server'; validates, honeypot, rate limit, Resend

# Utilities
lib/validation/contact.ts           ← zod schema (shared client + server)
lib/email/resend.ts                 ← thin Resend SDK wrapper
lib/ratelimit.ts                    ← Upstash rate limiter with in-memory fallback

# Messages
messages/ar.json                    ← add support.* namespace
messages/en.json                    ← add support.* namespace

# Config
.env.example                        ← document RESEND_API_KEY, SUPPORT_EMAIL,
                                       UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
```

## Complexity Tracking

No constitution violations.

---

## Phase 0: Research

*Complete. See [research.md](research.md).*

Key decisions:
- Email: Resend SDK — REST-based, Netlify-compatible, developer-friendly
- Rate limiting: Upstash Redis via `@upstash/ratelimit` — HTTP REST, works on Netlify; in-memory Map fallback for local dev
- Form: react-hook-form with zod resolver on client; same zod schema re-validated in Server Action
- FAQ reuse: import the existing `components/sections/FAQ.tsx` (self-contained Server Component); rendered as a full-width section below the form on mobile and desktop for simplicity and reuse
- RTL: all form inputs use `text-start`, labels and errors inherit direction from `dir` on `<html>`

---

## Phase 1: Design & Contracts

*Complete. See artifacts below.*

- **Data model**: [data-model.md](data-model.md) — contact submission shape, zod schema, message key tree, component interfaces
- **Verification guide**: [quickstart.md](quickstart.md) — 11 checks

**No contracts/ directory**: This feature exposes no external API. The Server Action is an internal server function, not a public endpoint.

**Post-Phase-1 Constitution Check re-evaluation**: All gates still pass. No hardcoded strings, no physical CSS, Server Components default, ContactForm `'use client'` justified.
