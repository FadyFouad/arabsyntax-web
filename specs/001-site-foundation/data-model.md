# Data Model: Site Foundation — Bilingual Shell

**Feature**: 001-site-foundation | **Date**: 2026-04-10

This feature has no database entities. The "data" is entirely structural:
locale configuration, message schemas, and navigation configuration that
are defined at build time.

---

## Locale Type

```typescript
// i18n/routing.ts
type Locale = 'ar' | 'en';

const locales = ['ar', 'en'] as const;
const defaultLocale: Locale = 'ar';
```

**Behavior per locale**:

| Locale | URL prefix | `<html dir>` | `<html lang>` | Body font class |
|--------|------------|--------------|---------------|-----------------|
| `ar`   | (none)     | `rtl`        | `ar`          | `font-arabic`   |
| `en`   | `/en`      | `ltr`        | `en`          | `font-english`  |

---

## Navigation Link Structure

Navigation items are static — defined once in the component and labeled via
message keys. They do not come from a database or CMS.

```typescript
// Used inside Header.tsx (Server Component)
type NavLink = {
  labelKey: string;   // key into nav.* message namespace
  href: string;       // destination path
};

const navLinks: NavLink[] = [
  { labelKey: 'features', href: '#features' },
  { labelKey: 'pricing',  href: '#pricing'  },
  { labelKey: 'faq',      href: '#faq'      },
  { labelKey: 'support',  href: '/support'  },
];
```

The `href` values for anchor links (`#features`, `#pricing`, `#faq`) do not
need to resolve during the foundation phase. `/support` will resolve once the
support page is built.

---

## Footer Link Group Structure

```typescript
type FooterLinkGroup = {
  headingKey: string;          // message key for column heading
  links: Array<{
    labelKey: string;          // message key for link label
    href: string;              // destination path
  }>;
};

const footerGroups: FooterLinkGroup[] = [
  {
    headingKey: 'product.heading',
    links: [
      { labelKey: 'product.features', href: '#features' },
      { labelKey: 'product.pricing',  href: '#pricing'  },
    ],
  },
  {
    headingKey: 'legal.heading',
    links: [
      { labelKey: 'legal.privacy', href: '/privacy' },
      { labelKey: 'legal.terms',   href: '/terms'   },
    ],
  },
  {
    headingKey: 'support.heading',
    links: [
      { labelKey: 'support.contact', href: '/support' },
      { labelKey: 'support.faq',     href: '#faq'     },
    ],
  },
];
```

Legal page links (`/privacy`, `/terms`) and `/support` are placeholder targets
during the foundation phase. They will be implemented in subsequent features.

---

## CSS Design Tokens (Compile-Time)

All design tokens are CSS custom properties, not runtime data. Defined in
`app/globals.css` inside the `@theme` block (Tailwind v4 CSS-first config):

```
--color-background      #0F1419    → bg-background, text-background
--color-surface         #1A1F26    → bg-surface
--color-surface-elevated #242A33   → bg-surface-elevated
--color-primary         #14B8A6    → bg-primary, text-primary
--color-primary-hover   #0D9488    → bg-primary-hover
--color-primary-fg      #0F1419    → text-primary-fg
--color-text            #F1F5F9    → text-text
--color-text-muted      #94A3B8    → text-text-muted
--color-border          #2A2F38    → border-border
--color-success         #22C55E    → bg-success, text-success
--color-error           #EF4444    → bg-error, text-error
--color-warning         #F59E0B    → text-warning

--font-cairo            (loaded via next/font/google)
--font-inter            (loaded via next/font/google)
--font-arabic           var(--font-cairo), system-ui, sans-serif
--font-english          var(--font-inter), system-ui, sans-serif
```

No database, API, or runtime data fetching is involved in this feature.
