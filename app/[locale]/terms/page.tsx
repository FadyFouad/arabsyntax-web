import type { Metadata } from 'next';
import { LegalLayout } from '@/components/layout/LegalLayout';
import ContentAr, { frontmatter as fmAr } from '@/content/legal/terms.ar.mdx';
import ContentEn, { frontmatter as fmEn } from '@/content/legal/terms.en.mdx';
import { siteConfig } from '@/lib/siteConfig';

const baseUrl = siteConfig.url;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fm = locale === 'ar' ? fmAr : fmEn;

  return {
    title: fm.title,
    description: fm.description,
    openGraph: {
      title: fm.title,
      description: fm.description,
      siteName: locale === 'ar' ? siteConfig.name.ar : siteConfig.name.en,
      url: locale === 'ar' ? `${siteConfig.url}/terms` : `${siteConfig.url}/en/terms`,
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
      type: 'article',
      images: [{ url: `${siteConfig.url}/og/og-image.png`, width: 1200, height: 630 }],
    },
    alternates: {
      canonical: locale === 'ar' ? `${baseUrl}/terms` : `${baseUrl}/en/terms`,
      languages: {
        ar: `${baseUrl}/terms`,
        en: `${baseUrl}/en/terms`,
      },
    },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const Content = locale === 'ar' ? ContentAr : ContentEn;
  const fm = locale === 'ar' ? fmAr : fmEn;

  return (
    <LegalLayout title={fm.title} lastUpdated={fm.lastUpdated}>
      <Content />
    </LegalLayout>
  );
}
