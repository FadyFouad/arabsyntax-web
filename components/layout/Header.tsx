import Image from 'next/image';
import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { siteConfig } from '@/lib/siteConfig';
import { featureFlags } from '@/lib/featureFlags';

export async function Header() {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const brandName = isAr ? siteConfig.name.ar : siteConfig.name.en;
  const tNav = await getTranslations('nav');
  const tCommon = await getTranslations('common');

  const navLinks = [
    { label: tNav('features'), href: '#features' },
    ...(featureFlags.showPricing ? [{ label: tNav('pricing'), href: '#pricing' }] : []),
    { label: tNav('faq'), href: '#faq' },
    { label: tNav('support'), href: '/support' },
  ];

  return (
    <header role="banner" className="border-b border-border bg-background relative z-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 bg-primary text-primary-fg px-4 py-2 rounded font-bold z-50"
      >
        {tCommon('skipToContent')}
      </a>
      
      <Container className="flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image src="/logos/logo.png" alt={brandName} width={120} height={40} priority />
          </Link>
          
          <nav className="hidden md:flex gap-6 items-center" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-text-muted hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <MobileMenu 
            links={navLinks} 
            labels={{ openMenu: tNav('openMenu'), closeMenu: tNav('closeMenu') }} 
          />
        </div>
      </Container>
    </header>
  );
}