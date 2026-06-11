import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'as-needed',
  // Mark the NEXT_LOCALE cookie Secure in production (HTTPS-only site). Kept off
  // in dev so it still sets over http://localhost. next-intl merges this with
  // its defaults (name: NEXT_LOCALE, sameSite: lax).
  localeCookie: { secure: process.env.NODE_ENV === 'production' }
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);