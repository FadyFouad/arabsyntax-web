import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // `go/` is excluded so the /go/:platform download-redirect route handler is
  // hit directly — next-intl would otherwise rewrite it under a locale segment
  // (localePrefix: as-needed) and the handler would never match.
  matcher: ['/', '/(ar|en)/:path*', '/((?!_next|_vercel|go/|.*\\..*).*)'],
};
