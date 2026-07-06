import Image from 'next/image';
import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { DesktopNav } from './DesktopNav';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { ThemeToggle } from './ThemeToggle';
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
    { label: tNav('lessons'), href: '/lessons' },
    { label: tNav('mutun'), href: '/mutun' },
    { label: tNav('i3rab'), href: '/i3rab' },
    { label: tNav('quiz'), href: '/quiz' },
    ...(featureFlags.showPricing ? [{ label: tNav('pricing'), href: '#pricing' }] : []),
    { label: tNav('faq'), href: '#faq' },
    { label: tNav('support'), href: '/support' },
  ];

  return (
    <header role="banner" className="border-b border-border bg-background sticky top-0 z-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 bg-primary text-primary-fg px-4 py-2 rounded font-bold z-50"
      >
        {tCommon('skipToContent')}
      </a>
      
      <Container className="flex items-center justify-between h-[var(--header-h)]">
        <div className="flex items-center gap-8">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/logos/logo-mark.png"
              alt={brandName}
              width={246}
              height={194}
              priority
              className="h-10 w-auto"
            />
          </Link>
          
          <DesktopNav links={navLinks} />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
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
