import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';

export async function Header() {
  const tNav = await getTranslations('nav');
  const tCommon = await getTranslations('common');

  const navLinks = [
    { label: tNav('features'), href: '#features' },
    { label: tNav('pricing'), href: '#pricing' },
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
          <Link href="/" className="flex flex-col hover:opacity-80 transition-opacity">
            <span className="font-english font-bold text-xl leading-none text-text">ArabSyntax</span>
            <span className="font-arabic font-bold text-sm leading-none text-primary mt-1">{tCommon('appNameAr')}</span>
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