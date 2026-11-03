'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LocaleSwitchLink } from './LocaleSwitchLink';

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('footer.langSwitcher');

  return (
    <div className="flex gap-2 items-center" aria-label={t('label')} role="group">
      <LocaleSwitchLink
        locale="ar"
        aria-current={locale === 'ar' ? 'true' : undefined}
        className={locale === 'ar' ? 'text-primary font-bold' : 'text-text-muted hover:text-text'}
      >
        {t('ar')}
      </LocaleSwitchLink>
      <span className="text-border" aria-hidden="true">|</span>
      <LocaleSwitchLink
        locale="en"
        aria-current={locale === 'en' ? 'true' : undefined}
        className={locale === 'en' ? 'text-primary font-bold' : 'text-text-muted hover:text-text'}
      >
        {t('en')}
      </LocaleSwitchLink>
    </div>
  );
}
