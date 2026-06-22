'use client';

import { useEffect, useState } from 'react';
import { usePathname } from '@/i18n/routing';
import { NavLink } from './SectionNav';

interface NavItem {
  label: string;
  href: string;
}

/**
 * Desktop main navigation. Highlights the active link with a growing underline:
 * route links match on pathname, and homepage section links use a scroll-spy
 * (IntersectionObserver) so the indicator follows the section currently in view.
 */
export function DesktopNav({ links }: { links: NavItem[] }) {
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState('');

  useEffect(() => {
    // Off the homepage there are no sections to spy on; a stale hash is harmless
    // because isActive() only honours section links when pathname === '/'.
    if (pathname !== '/') return;

    const sections = links
      .filter((l) => l.href.startsWith('#'))
      .map((l) => document.getElementById(l.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    // A thin band around the viewport's vertical center decides what's "active".
    const observer = new IntersectionObserver(
      (entries) => {
        const topMost = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (topMost) setActiveHash(`#${topMost.target.id}`);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [pathname, links]);

  function isActive(href: string) {
    if (href.startsWith('#')) {
      return pathname === '/' && activeHash === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="hidden md:flex gap-6 items-center" aria-label="Main Navigation">
      {links.map((link) => {
        const active = isActive(link.href);
        return (
          <NavLink
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`relative font-medium transition-colors after:absolute after:-bottom-1 after:start-0 after:h-0.5 after:w-full after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-200 after:content-[''] ${
              active
                ? 'text-primary after:scale-x-100'
                : 'text-text-muted hover:text-primary after:scale-x-0 hover:after:scale-x-100'
            }`}
          >
            {link.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
