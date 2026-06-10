import { notFound } from 'next/navigation';

// Catch-all for unmatched routes within the [locale] segment. next-intl routes
// every request through a locale, so triggering notFound() here renders the
// localized app/[locale]/not-found.tsx inside the locale layout (RTL, header,
// footer) instead of Next.js's unstyled default 404.
export default function CatchAllPage() {
  notFound();
}
