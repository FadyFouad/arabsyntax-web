'use client';

import { usePathname, Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';

// Sections that exist in Arabic only — switching to English from these lands on
// a 404, so the English target falls back to the English home instead.
const AR_ONLY_PREFIXES = ['/i3rab'];

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('footer.langSwitcher');

  const isArOnly = AR_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const enHref = isArOnly ? '/' : pathname;

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
        href={enHref}
        locale="en"
        aria-current={locale === 'en' ? 'true' : undefined}
        className={locale === 'en' ? 'text-primary font-bold' : 'text-text-muted hover:text-text'}
      >
        {t('en')}
      </Link>
    </div>
  );
}