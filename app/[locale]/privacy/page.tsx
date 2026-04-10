import type { Metadata } from 'next';
import { LegalLayout } from '@/components/layout/LegalLayout';
import ContentAr, { frontmatter as fmAr } from '@/content/legal/privacy.ar.mdx';
import ContentEn, { frontmatter as fmEn } from '@/content/legal/privacy.en.mdx';

const baseUrl = 'https://arabsyntax.com';

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
    alternates: {
      canonical: locale === 'ar' ? `${baseUrl}/privacy` : `${baseUrl}/en/privacy`,
      languages: {
        ar: `${baseUrl}/privacy`,
        en: `${baseUrl}/en/privacy`,
      },
    },
  };
}

export default async function PrivacyPage({
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
