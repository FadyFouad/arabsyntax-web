import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // `go/` and `api/` are excluded so their route handlers (the /go/:platform
  // download redirect and the /api/quiz/* endpoints) are hit directly —
  // next-intl would otherwise rewrite them under a locale segment
  // (localePrefix: as-needed) and the handlers would never match.
  matcher: ['/', '/(ar|en)/:path*', '/((?!_next|_vercel|go/|api/|.*\\..*).*)'],
};
