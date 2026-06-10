import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import createNextIntlPlugin from 'next-intl/plugin';
import createMDX from '@next/mdx';

void initOpenNextCloudflareForDev();

const withNextIntl = createNextIntlPlugin();
const withMDX = createMDX({ extension: /\.mdx?$/ });

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  images: {
    unoptimized: true,
  },
  outputFileTracingIncludes: {
    '/*': ['./content/**/*'],
  },
};

export default withMDX(withNextIntl(nextConfig));
