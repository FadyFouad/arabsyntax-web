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
const isDev = process.env.NODE_ENV !== 'production';

// ─── Firebase (feature 006, web accounts) ────────────────────────────────────
// Every allowance below is added ONLY when NEXT_PUBLIC_WEB_ACCOUNTS=true, so the
// production policy stays byte-identical to today until the launch gates pass.
// Keep in sync with lib/firebase/config.ts and firebase.json.
const webAccounts = process.env.NEXT_PUBLIC_WEB_ACCOUNTS === 'true';
const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === 'true';
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '';

// The emulator suite is plain http on loopback (firebase.json ports).
const emulatorOrigins = useEmulators
  ? ['http://127.0.0.1:9099', 'http://localhost:9099', 'http://127.0.0.1:8080', 'http://localhost:8080']
  : [];

// identitytoolkit/securetoken: auth REST + token refresh. firestore: progress and
// purchases reads/writes. firebaseinstallations: required by the analytics module.
// google-analytics/googletagmanager: the GA4 transport behind logEvent().
const firebaseConnect = webAccounts
  ? [
      'https://identitytoolkit.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://firestore.googleapis.com',
      'https://firebaseinstallations.googleapis.com',
      'https://www.googleapis.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.googletagmanager.com',
      ...emulatorOrigins,
    ]
  : [];

// apis.google.com hosts the gapi loader the auth helper iframe pulls in;
// googletagmanager.com serves gtag.js once a sign-in attempt initializes analytics.
const firebaseScript = webAccounts
  ? ['https://apis.google.com', 'https://www.googletagmanager.com']
  : [];

// signInWithPopup/Redirect mount a hidden helper iframe on the authDomain (and,
// in production, an apis.google.com bridge). The popup itself is a new browsing
// context, which CSP frame-src does not govern. Against the emulator the helper
// is served from the loopback auth origin instead.
const firebaseFrame = webAccounts
  ? [...(authDomain ? [`https://${authDomain}`] : []), 'https://apis.google.com', ...emulatorOrigins]
  : [];

const directive = (name: string, ...values: string[]) =>
  [name, ...values.filter(Boolean)].join(' ');

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // challenges.cloudflare.com: the contact form's Turnstile widget renders in an
  // iframe from there.
  directive('frame-src', 'https://challenges.cloudflare.com', ...firebaseFrame),
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // static.cloudflareinsights.com serves the Web Analytics beacon script;
  // challenges.cloudflare.com serves the Turnstile widget script (api.js).
  // 'unsafe-eval' is added in development only — Turbopack/React need eval() for
  // HMR and debugging; production builds keep the stricter policy without it.
  directive(
    'script-src',
    "'self'",
    "'unsafe-inline'",
    isDev ? "'unsafe-eval'" : '',
    'https://static.cloudflareinsights.com',
    'https://challenges.cloudflare.com',
    ...firebaseScript,
  ),
  // The beacon POSTs RUM data to cloudflareinsights.com; the Turnstile widget
  // talks to challenges.cloudflare.com to fetch/solve the challenge.
  directive(
    'connect-src',
    "'self'",
    'https://cloudflareinsights.com',
    'https://challenges.cloudflare.com',
    ...firebaseConnect,
  ),
  "manifest-src 'self'",
  // Omitted against the emulator: it upgrades the loopback http:// origins to
  // https:// and every emulator request fails. Never omitted in a deployed build.
  useEmulators ? '' : 'upgrade-insecure-requests',
]
  .filter(Boolean)
  .join('; ');

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
