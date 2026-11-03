'use client';

import NextLink from 'next/link';
import { usePathname, Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('footer.langSwitcher');

  return (
    <div className="flex gap-2 items-center" aria-label={t('label')} role="group">
      {/* Arabic is the unprefixed default locale. next-intl's <Link locale="ar">
          always forces an /ar/ prefix (which only redirects back), so link the
          bare path. Relies on localeDetection: false in i18n/routing.ts — with
          detection on, a NEXT_LOCALE=en cookie would bounce this back to /en. */}
      <NextLink
        href={pathname}
        aria-current={locale === 'ar' ? 'true' : undefined}
        className={locale === 'ar' ? 'text-primary font-bold' : 'text-text-muted hover:text-text'}
      >
        {t('ar')}
      </NextLink>
      <span className="text-border" aria-hidden="true">|</span>
      <Link
        href={pathname}
        locale="en"
        aria-current={locale === 'en' ? 'true' : undefined}
        className={locale === 'en' ? 'text-primary font-bold' : 'text-text-muted hover:text-text'}
      >
        {t('en')}
      </Link>
    </div>
  );
}