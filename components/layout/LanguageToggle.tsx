'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

/**
 * Compact header language control: one button that switches straight to the
 * other locale. The badge shows the *target* language (EN on Arabic pages,
 * ع on English pages), which is the convention users expect from a toggle.
 * The footer keeps the full two-link LanguageSwitcher.
 */
export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('footer.langSwitcher');

  const target = locale === 'ar' ? 'en' : 'ar';
  const targetName = t(target);

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      aria-label={`${t('label')}: ${targetName}`}
      title={targetName}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-text-muted transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Languages className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span
        lang={target}
        className={target === 'ar' ? 'text-base font-bold leading-none' : 'text-sm font-semibold leading-none tracking-wide'}
      >
        {target === 'ar' ? 'ع' : 'EN'}
      </span>
    </Link>
  );
}
