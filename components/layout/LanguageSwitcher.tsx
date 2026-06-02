'use client';

import { usePathname, Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('footer.langSwitcher');

  return (
    <div className="flex gap-2 items-center" aria-label={t('label')} role="group">
      <Link
        href={pathname}
        locale="ar"
        aria-current={locale === 'ar' ? 'true' : undefined}
        className={locale === 'ar' ? 'text-primary font-bold' : 'text-text-muted hover:text-text'}
      >
        {t('ar')}
      </Link>
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