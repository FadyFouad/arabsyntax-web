import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { LanguageSwitcher } from './LanguageSwitcher';
import { siteConfig } from '@/lib/siteConfig';
import { featureFlags } from '@/lib/featureFlags';

export async function Footer() {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const brandName = isAr ? siteConfig.name.ar : siteConfig.name.en;
  const t = await getTranslations('footer');
  const currentYear = new Date().getFullYear();

  const groups = [
    {
      heading: t('product.heading'),
      links: [
        { label: t('product.features'), href: '#features' },
        ...(featureFlags.showPricing ? [{ label: t('product.pricing'), href: '#pricing' }] : []),
      ],
    },
    {
      heading: t('legal.heading'),
      links: [
        { label: t('legal.privacy'), href: '/privacy' },
        { label: t('legal.terms'), href: '/terms' },
      ],
    },
    {
      heading: t('support.heading'),
      links: [
        { label: t('support.contact'), href: '/support' },
        { label: t('support.faq'), href: '#faq' },
      ],
    },
  ];

  return (
    <footer role="contentinfo" className="border-t border-border bg-background pt-12 pb-8">
      <Container className="flex flex-col gap-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex flex-col gap-4">
            <span className="font-bold text-2xl text-text">{brandName}</span>
            <LanguageSwitcher />
          </div>

          {groups.map((group) => (
            <nav key={group.heading} aria-label={group.heading} className="flex flex-col gap-4">
              <h3 className="font-bold text-text text-lg">{group.heading}</h3>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-text-muted hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-text-muted text-sm text-center md:text-start">
            {t('copyright', { year: currentYear })}
          </p>
        </div>
      </Container>
    </footer>
  );
}