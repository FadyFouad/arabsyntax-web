'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from '@/i18n/routing';
import { NavLink } from './SectionNav';

interface NavItem {
  label: string;
  href: string;
}

interface MobileMenuProps {
  links: NavItem[];
  labels: {
    openMenu: string;
    closeMenu: string;
  };
}

export function MobileMenu({ links, labels }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Kept mounted through the exit animation, then unmounted on animationend.
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const [hash, setHash] = useState('');

  // Track the URL hash so homepage section links can show as active. `hashchange`
  // covers browser navigation; we also refresh on open since in-app section
  // clicks use pushState (which doesn't fire hashchange).
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  function isActive(href: string) {
    if (href.startsWith('#')) {
      return pathname === '/' && hash === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function openMenu() {
    setHash(window.location.hash);
    setIsMounted(true);
    setIsOpen(true);
  }

  function closeMenu() {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setIsOpen(false);
    // No exit animation fires under reduced motion, so unmount immediately.
    if (reduceMotion) setIsMounted(false);
  }

  return (
    <div className="md:hidden">
      <button
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? labels.closeMenu : labels.openMenu}
        className="rounded-lg p-2 text-text transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isMounted && (
        <nav
          id="mobile-menu"
          onAnimationEnd={() => {
            // Unmount only after the close animation has played out.
            if (!isOpen) setIsMounted(false);
          }}
          className={`absolute top-full start-0 w-full origin-top rounded-b-2xl border-b border-border/60 bg-background/80 shadow-2xl shadow-black/30 backdrop-blur-xl ${
            isOpen ? 'mobile-menu-in' : 'mobile-menu-out pointer-events-none'
          }`}
        >
          <ul className="flex flex-col gap-1 px-4 py-4">
            {links.map((link, index) => {
              const active = isActive(link.href);
              return (
                <li
                  key={link.href}
                  className="group relative mobile-menu-item"
                  style={{ animationDelay: isOpen ? `${index * 45}ms` : '0ms' }}
                >
                  {/* Active / hover accent rail (start-aligned, RTL-safe) */}
                  <span
                    aria-hidden
                    className={`absolute inset-y-1.5 start-0 w-1 origin-center rounded-full bg-primary transition-transform duration-200 ${
                      active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
                    }`}
                  />
                  <NavLink
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-xl px-4 py-2.5 text-lg font-medium transition-all duration-200 hover:bg-primary/10 hover:ps-5 hover:text-primary active:scale-[0.98] ${
                      active ? 'bg-primary/10 ps-5 font-semibold text-primary' : 'text-text'
                    }`}
                    onNavigate={closeMenu}
                  >
                    {link.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
