import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export const proxy = createMiddleware(routing);

export const config = {
  matcher: ['/', '/(ar|en)/:path*', '/((?!_next|_vercel|.*\\..*).*)']
};