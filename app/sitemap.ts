import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

const ROUTES = ['', '/privacy', '/terms', '/support'] as const;
const LOCALES = ['ar', 'en'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();
  for (const route of ROUTES) {
    for (const locale of LOCALES) {
      const path = locale === 'ar' ? route : `/en${route}`;
      entries.push({
        url: `${siteConfig.url}${path || '/'}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: route === '' ? 1.0 : 0.5,
        alternates: {
          languages: {
            ar: `${siteConfig.url}${route || '/'}`,
            en: `${siteConfig.url}/en${route}`,
          }
        }
      });
    }
  }
  return entries;
}
