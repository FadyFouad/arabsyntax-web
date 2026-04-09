'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface NavLink {
  label: string;
  href: string;
}

interface MobileMenuProps {
  links: NavLink[];
  labels: {
    openMenu: string;
    closeMenu: string;
  };
}

export function MobileMenu({ links, labels }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? labels.closeMenu : labels.openMenu}
        className="p-2 text-text hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <nav
          id="mobile-menu"
          className="absolute top-full start-0 w-full bg-surface-elevated border-b border-border shadow-lg"
        >
          <ul className="flex flex-col py-4 px-4 gap-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block text-text hover:text-primary transition-colors font-medium text-lg"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}