import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name.en,
    short_name: siteConfig.name.en,
    description: 'Structured audio lessons that take you from zero to mastering Arabic grammar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F1419',
    theme_color: '#0F1419',
    lang: 'ar',
    dir: 'rtl',
    categories: ['education'],
    icons: [
      { src: '/logos/logo.png', sizes: 'any', type: 'image/png' },
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
  };
}
