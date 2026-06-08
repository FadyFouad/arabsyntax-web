'use client';

import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/routing';

interface NavLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}

/**
 * Scrolls to a homepage section, keeps the URL hash in sync (shareability +
 * back button) and moves focus to the section for keyboard / screen-reader
 * users. Respects `prefers-reduced-motion`.
 */
function scrollToSection(target: HTMLElement, sectionId: string, updateHash: boolean) {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });

  // Update the hash without a second (jumpy) scroll. Skipped on load, where the
  // hash is already present and we must not push a duplicate history entry.
  if (updateHash) {
    history.pushState(null, '', `#${sectionId}`);
  }

  // Make the section programmatically focusable just long enough to land focus
  // there, then restore the DOM so we don't leave stray tabindex attributes.
  const hadTabIndex = target.hasAttribute('tabindex');
  if (!hadTabIndex) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  if (!hadTabIndex) {
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  }
}

/**
 * A header link that targets a section that lives only on the homepage
 * (`#features`, `#pricing`, `#faq`, …).
 *
 * - On the homepage: prevents navigation and smooth-scrolls to the section.
 * - On any other route: renders a real `/#id` anchor and lets the browser /
 *   router navigate home, where {@link SectionScrollOnLoad} performs the scroll.
 *
 * Modified clicks (new tab/window) and the no-section case fall through to the
 * native anchor behaviour, so accessibility and back-button stay intact.
 */
export function SectionLink({ href, className, children, onNavigate }: NavLinkProps) {
  const sectionId = href.replace(/^#/, '');
  const pathname = usePathname();
  const isHome = pathname === '/';

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onNavigate?.();

    if (
      !isHome ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = document.getElementById(sectionId);
    if (!target) return; // never scroll when the section isn't on this page

    event.preventDefault();
    scrollToSection(target, sectionId, true);
  }

  return (
    <Link href={{ pathname: '/', hash: sectionId }} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

/**
 * Renders a header link as either a homepage-section link or a normal route
 * link, based on whether `href` is a hash. Shared by the desktop nav and the
 * mobile menu so both behave identically.
 */
export function NavLink({ href, className, children, onNavigate }: NavLinkProps) {
  if (href.startsWith('#')) {
    return (
      <SectionLink href={href} className={className} onNavigate={onNavigate}>
        {children}
      </SectionLink>
    );
  }

  return (
    <Link href={href} className={className} onClick={onNavigate}>
      {children}
    </Link>
  );
}

/**
 * Mounted on the homepage. When the page is reached with a hash (e.g. arriving
 * from /terms via a section link), scrolls to the target once the DOM is ready.
 * No-ops when there is no hash or no matching element.
 */
export function SectionScrollOnLoad() {
  useEffect(() => {
    const sectionId = window.location.hash.replace(/^#/, '');
    if (!sectionId) return;

    const target = document.getElementById(sectionId);
    if (!target) return;

    // Defer a frame so layout has settled after the route transition.
    const raf = requestAnimationFrame(() => scrollToSection(target, sectionId, false));
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
