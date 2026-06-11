import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import createNextIntlPlugin from 'next-intl/plugin';
import createMDX from '@next/mdx';

void initOpenNextCloudflareForDev();

const withNextIntl = createNextIntlPlugin();
const withMDX = createMDX({ extension: /\.mdx?$/ });

// Static, mostly-self-hosted site: next/font self-hosts fonts under /_next, the
// only inline scripts are the theme-init bootstrap and JSON-LD blocks, and the
// contact form posts to a same-origin Server Action. So 'self' covers nearly
// everything; 'unsafe-inline' (no nonce) keeps pages statically rendered while
// permitting those inline scripts/styles. Store badges are plain outbound <a>
// links, not embeds, so they need no allowance here.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  // Don't advertise the framework via X-Powered-By.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Allow the dev server (incl. HMR over WebSocket) to be reached through a
  // Cloudflare quick tunnel. Dev-only; the subdomain is random per run, so the
  // whole service is allowlisted. Has no effect on production builds.
  allowedDevOrigins: ['*.trycloudflare.com'],
  images: {
    unoptimized: true,
  },
  outputFileTracingIncludes: {
    '/*': ['./content/**/*'],
  },
};

export default withMDX(withNextIntl(nextConfig));
