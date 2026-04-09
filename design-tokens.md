# ArabSyntax Website — Design Tokens

Single source of truth for colors, typography, spacing, and other visual primitives. Drop this file at the repo root as `design-tokens.md` so it can be referenced from feature specs and from the generated `globals.css`.

> ⚠️ The colors below are placeholders matched to the *spirit* of ArabSyntax's dark theme (deep neutral background + teal accent). **Replace with the exact values from the Flutter `ColorScheme`** (especially `tealAccent` and `onInfo` extensions) before final launch.

---

## Colors

All colors are defined as CSS custom properties on `:root` in `app/globals.css` and exposed to Tailwind via `tailwind.config.ts` under `theme.extend.colors`.

| Token | CSS Variable | Hex | Tailwind Utility | Usage |
|---|---|---|---|---|
| Background | `--color-background` | `#0F1419` | `bg-background` | Page background |
| Surface | `--color-surface` | `#1A1F26` | `bg-surface` | Cards, panels |
| Surface Elevated | `--color-surface-elevated` | `#242A33` | `bg-surface-elevated` | Modals, popovers, hover states |
| Primary | `--color-primary` | `#14B8A6` | `bg-primary` `text-primary` | CTA buttons, links, accents |
| Primary Hover | `--color-primary-hover` | `#0D9488` | `bg-primary-hover` | Button hover state |
| Primary Foreground | `--color-primary-foreground` | `#0F1419` | `text-primary-foreground` | Text on primary buttons |
| Text Primary | `--color-text` | `#F1F5F9` | `text-text` | Body text, headings |
| Text Secondary | `--color-text-muted` | `#94A3B8` | `text-text-muted` | Captions, metadata |
| Border | `--color-border` | `#2A2F38` | `border-border` | Card borders, dividers |
| Success | `--color-success` | `#22C55E` | `bg-success` `text-success` | Form success states |
| Error | `--color-error` | `#EF4444` | `bg-error` `text-error` | Form error states |
| Warning | `--color-warning` | `#F59E0B` | `text-warning` | Warning callouts |

### Tailwind config snippet

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          foreground: 'var(--color-primary-foreground)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
      },
    },
  },
}
```

### globals.css snippet

```css
@import "tailwindcss";

:root {
  --color-background: #0F1419;
  --color-surface: #1A1F26;
  --color-surface-elevated: #242A33;
  --color-primary: #14B8A6;
  --color-primary-hover: #0D9488;
  --color-primary-foreground: #0F1419;
  --color-text: #F1F5F9;
  --color-text-muted: #94A3B8;
  --color-border: #2A2F38;
  --color-success: #22C55E;
  --color-error: #EF4444;
  --color-warning: #F59E0B;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--color-background);
  color: var(--color-text);
}
```

### Contrast requirements

All text/background combinations must meet WCAG AA:
- `text` on `background`: must be ≥ 4.5:1 (verify with a contrast checker)
- `text` on `surface`: must be ≥ 4.5:1
- `text-muted` on `background`: must be ≥ 4.5:1 for body text, ≥ 3:1 for large text only
- `primary-foreground` on `primary`: must be ≥ 4.5:1

---

## Typography

### Font families

| Locale | Family | Weights | CSS Variable |
|---|---|---|---|
| Arabic (`ar`) | Cairo | 400, 500, 600, 700 | `--font-cairo` |
| English (`en`) | Inter | 400, 500, 600, 700 | `--font-inter` |

### Loading (next/font/google)

```ts
// app/[locale]/layout.tsx
import { Cairo, Inter } from 'next/font/google';

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});
```

### Applying fonts based on locale

```tsx
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${cairo.variable} ${inter.variable}`}>
  <body className={locale === 'ar' ? 'font-arabic' : 'font-english'}>
    {children}
  </body>
</html>
```

```ts
// tailwind.config.ts — font families
fontFamily: {
  arabic: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
  english: ['var(--font-inter)', 'system-ui', 'sans-serif'],
},
```

### Type scale

| Element | Size | Weight | Line Height | Tailwind |
|---|---|---|---|---|
| H1 (hero) | 48px / 60px responsive | 700 | 1.1 | `text-5xl lg:text-6xl font-bold leading-tight` |
| H2 (section) | 36px / 48px responsive | 700 | 1.2 | `text-4xl lg:text-5xl font-bold leading-tight` |
| H3 (card title) | 20px / 24px | 600 | 1.3 | `text-xl lg:text-2xl font-semibold` |
| Body large | 18px | 400 | 1.7 | `text-lg leading-relaxed` |
| Body | 16px | 400 | 1.7 | `text-base leading-relaxed` |
| Small | 14px | 400 | 1.6 | `text-sm` |
| Caption | 12px | 500 | 1.5 | `text-xs font-medium` |

> Arabic line-height should be slightly more generous than English (1.8 vs 1.7) for diacritics. Apply via a `prose-rtl` variant or per-component.

---

## Spacing

Use Tailwind's default spacing scale. Common section/component patterns:

| Pattern | Class |
|---|---|
| Section vertical padding (mobile) | `py-16` |
| Section vertical padding (desktop) | `lg:py-24` |
| Container max width | `max-w-7xl` |
| Container horizontal padding | `px-4 sm:px-6 lg:px-8` |
| Card padding | `p-6 lg:p-8` |
| Stack gap between elements | `space-y-4` (small), `space-y-6` (default), `space-y-8` (large) |

---

## Border Radius

| Element | Class |
|---|---|
| Cards | `rounded-2xl` |
| Buttons | `rounded-xl` |
| Inputs | `rounded-lg` |
| Pills / badges | `rounded-full` |
| Images / mockups | `rounded-3xl` |

---

## Shadows

Dark themes use shadows sparingly. Prefer borders and elevated surface colors for depth.

| Use case | Class |
|---|---|
| Card hover lift | `hover:shadow-lg hover:shadow-black/40` |
| Modal / popover | `shadow-2xl shadow-black/60` |

---

## Breakpoints (Tailwind defaults)

| Breakpoint | Min width | Use case |
|---|---|---|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

Mobile-first: write base styles for mobile, then layer `md:` / `lg:` for larger screens.

---

## Motion

- Default duration: `duration-200` (200ms) for micro-interactions, `duration-500` for scroll-in animations.
- Default easing: `ease-out` for entrances, `ease-in-out` for transitions.
- All non-essential animations must check `prefers-reduced-motion`:

```tsx
import { useReducedMotion } from 'framer-motion';

const shouldReduceMotion = useReducedMotion();
const animationProps = shouldReduceMotion
  ? {}
  : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
```

---

## Z-index scale

| Layer | Value |
|---|---|
| Base | `z-0` |
| Sticky header | `z-40` |
| Dropdowns | `z-50` |
| Modals | `z-60` |
| Toasts | `z-70` |

---

## TODO before launch

- [ ] Replace all color hex values with the exact values from the Flutter `ColorScheme` (especially the teal accent).
- [ ] Verify every text/background pair against a contrast checker.
- [ ] Confirm Cairo renders all required Arabic characters and diacritics correctly.
- [ ] Decide whether to add an alternate Arabic font (e.g., Tajawal) as a comparison option.