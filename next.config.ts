import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import createMDX from '@next/mdx';

const withNextIntl = createNextIntlPlugin();
const withMDX = createMDX({ extension: /\.mdx?$/ });

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  // Allow the dev server (incl. HMR over WebSocket) to be reached through a
  // Cloudflare quick tunnel. Dev-only; the subdomain is random per run, so the
  // whole service is allowlisted. Has no effect on production builds.
  allowedDevOrigins: ['*.trycloudflare.com'],
};

export default withMDX(withNextIntl(nextConfig));