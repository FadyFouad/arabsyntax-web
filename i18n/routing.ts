import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'as-needed',
  // Pages declare hreflang in their <head> via generateMetadata. The middleware's
  // default `Link` response header would re-add an `en` alternate on pages that
  // deliberately omit it (mutun, i3rab), so turn the header off.
  alternateLinks: false,
  // Locale comes from the URL only: no NEXT_LOCALE cookie / Accept-Language
  // redirects. Keeps every URL stable for crawlers (a bot sending
  // `Accept-Language: en` would otherwise be 307'd to /en) and lets the
  // LanguageSwitcher link to the unprefixed Arabic URL directly.
  localeDetection: false,
  // Mark the NEXT_LOCALE cookie Secure in production (HTTPS-only site). Kept off
  // in dev so it still sets over http://localhost. next-intl merges this with
  // its defaults (name: NEXT_LOCALE, sameSite: lax).
  localeCookie: { secure: process.env.NODE_ENV === 'production' }
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);