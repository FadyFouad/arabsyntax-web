# Data Model: Legal Pages

**Feature**: 003-legal-pages | **Date**: 2026-04-10

No database entities. All content is static MDX files read at build time.

---

## Document Registry

| Document | Arabic URL | English URL | MDX file (ar) | MDX file (en) |
|----------|-----------|-------------|---------------|---------------|
| Privacy Policy | `/privacy` | `/en/privacy` | `content/legal/privacy.ar.mdx` | `content/legal/privacy.en.mdx` |
| Terms of Service | `/terms` | `/en/terms` | `content/legal/terms.ar.mdx` | `content/legal/terms.en.mdx` |

---

## MDX Frontmatter Schema

Each MDX file exports a `frontmatter` const at the top of the file:

```typescript
type LegalFrontmatter = {
  title: string;        // Page <h1> and <title> tag
  lastUpdated: string;  // ISO 8601 date, e.g. "2026-04-10"
  description: string;  // <meta description> for SEO
};

// Example export at top of MDX file:
export const frontmatter = {
  title: 'سياسة الخصوصية',
  lastUpdated: '2026-04-10',
  description: 'كيف يجمع تطبيق النحو العربي بياناتك ويستخدمها.',
};
```

**Updating the "Last Updated" date**: Edit the `lastUpdated` field in the relevant MDX file. One edit per document. The page component reads and displays this value through `LegalLayout`.

---

## Privacy Policy — Section Structure

12 sections, rendered as `<h2>` headings in the MDX body:

| # | Section key | Arabic heading | English heading |
|---|-------------|----------------|-----------------|
| 1 | intro | المقدمة | Introduction |
| 2 | collected | المعلومات التي نجمعها | Information We Collect |
| 3 | usage | كيف نستخدم المعلومات | How We Use Information |
| 4 | third-party | خدمات الطرف الثالث | Third-Party Services |
| 5 | ads | الإعلانات والموافقة | Ads and Consent |
| 6 | retention | الاحتفاظ بالبيانات | Data Retention |
| 7 | children | خصوصية الأطفال | Children's Privacy |
| 8 | rights | حقوقك | Your Rights |
| 9 | security | الأمان | Security |
| 10 | international | المستخدمون الدوليون | International Users |
| 11 | changes | التغييرات على هذه السياسة | Changes to This Policy |
| 12 | contact | التواصل معنا | Contact |

---

## Terms of Service — Section Structure

12 sections, rendered as `<h2>` headings in the MDX body:

| # | Section key | Arabic heading | English heading |
|---|-------------|----------------|-----------------|
| 1 | acceptance | قبول الشروط | Acceptance of Terms |
| 2 | service | وصف الخدمة | Description of Service |
| 3 | license | الترخيص | License to Use |
| 4 | billing | الاشتراكات والفواتير | Subscriptions and Billing |
| 5 | legacy | المستخدمون القدامى | Legacy Purchasers |
| 6 | conduct | سلوك المستخدم | User Conduct |
| 7 | ip | الملكية الفكرية | Intellectual Property |
| 8 | warranties | إخلاء المسؤولية عن الضمانات | Disclaimer of Warranties |
| 9 | liability | تحديد المسؤولية | Limitation of Liability |
| 10 | changes | التغييرات على الشروط | Changes to Terms |
| 11 | law | القانون الحاكم | Governing Law |
| 12 | contact | التواصل معنا | Contact |

---

## Component Interface: LegalLayout

```typescript
interface LegalLayoutProps {
  title: string;         // From MDX frontmatter.title
  lastUpdated: string;   // From MDX frontmatter.lastUpdated (ISO date)
  locale: string;        // 'ar' | 'en' — for "Last updated" label locale
  children: React.ReactNode; // The rendered MDX content
}
```

Renders:
- `<div className="max-w-prose mx-auto px-4 sm:px-6 py-12">`
  - `<h1>` with `title`
  - `<p className="text-text-muted text-sm">` with locale-appropriate "Last updated: {lastUpdated}"
  - `<article className="prose mt-8">` wrapping `children`

---

## Messages Extension (`legal` namespace)

Two new keys added to `messages/ar.json` and `messages/en.json`:

```typescript
type LegalMessages = {
  legal: {
    lastUpdated: string; // "آخر تحديث" / "Last updated"
    privacyTitle: string; // For footer/nav display
    termsTitle: string;   // For footer/nav display
  };
};
```

---

## New UI Components

| Component | Type | Reusability |
|-----------|------|-------------|
| `LegalLayout` | Server Component (`components/layout/`) | Both Privacy and Terms pages |

---

## New Source Files

```text
# Install
@next/mdx @mdx-js/loader @mdx-js/react @types/mdx
@tailwindcss/typography

# Config
next.config.ts              ← add withMDX wrapper + pageExtensions
mdx-components.tsx          ← required @next/mdx root file (empty components object)

# Content
content/legal/
  privacy.ar.mdx            ← Arabic privacy policy + frontmatter export
  privacy.en.mdx            ← English privacy policy + frontmatter export
  terms.ar.mdx              ← Arabic terms of service + frontmatter export
  terms.en.mdx              ← English terms of service + frontmatter export

# Pages
app/[locale]/privacy/page.tsx   ← imports MDX files, passes to LegalLayout
app/[locale]/terms/page.tsx     ← imports MDX files, passes to LegalLayout

# Components
components/layout/LegalLayout.tsx

# Styles
app/globals.css             ← add @plugin "@tailwindcss/typography" + prose customization

# Messages
messages/ar.json            ← add legal.lastUpdated + legal.privacyTitle + legal.termsTitle
messages/en.json            ← matching keys
```
