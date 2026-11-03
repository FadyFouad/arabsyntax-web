'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { Link, routing, usePathname } from '@/i18n/routing';

type Props = Omit<ComponentProps<typeof Link>, 'href' | 'locale'> & {
  locale: (typeof routing.locales)[number];
};

/**
 * A link to the current page in another locale. Use this for every language
 * switcher instead of next-intl's `<Link locale=…>`.
 *
 * With localePrefix 'as-needed', `<Link locale="ar">` always forces an /ar/
 * prefix, which only 308s back to the unprefixed URL (next.config redirects) —
 * crawlers then see a redirecting internal link on every English page. The
 * default locale therefore gets the bare path via next/link. This relies on
 * `localeDetection: false` (i18n/routing.ts); with detection on, a
 * NEXT_LOCALE=en cookie would bounce the bare path back to /en.
 */
export function LocaleSwitchLink({ locale, ...rest }: Props) {
  const pathname = usePathname();
  if (locale === routing.defaultLocale) return <NextLink href={pathname} {...rest} />;
  return <Link href={pathname} locale={locale} {...rest} />;
}
