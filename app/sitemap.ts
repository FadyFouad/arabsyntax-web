import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';
import { getAllSlugs } from '@/lib/lessons/loader';

const STATIC_ROUTES = ['', '/privacy', '/terms', '/support', '/lessons'] as const;
const LOCALES = ['ar', 'en'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();
  const routes = [...STATIC_ROUTES, ...getAllSlugs().map((slug) => `/lessons/${slug}`)];

  for (const route of routes) {
    for (const locale of LOCALES) {
      const path = locale === 'ar' ? route : `/en${route}`;
      entries.push({
        url: `${siteConfig.url}${path || '/'}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: route === '' ? 1.0 : route.startsWith('/lessons/') ? 0.7 : 0.5,
        alternates: {
          languages: {
            ar: `${siteConfig.url}${route || '/'}`,
            en: `${siteConfig.url}/en${route}`,
          },
        },
      });
    }
  }
  return entries;
}
