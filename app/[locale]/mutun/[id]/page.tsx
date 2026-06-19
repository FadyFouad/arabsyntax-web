import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { MatnBody } from '@/components/mutun/MatnBody';
import { siteConfig } from '@/lib/siteConfig';
import { getMatn, getMatnIds } from '@/lib/mutun/loader';
import { type Locale } from '@/lib/lessons/loader';
import { serializeJsonLd } from '@/lib/jsonLd';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export function generateStaticParams() {
  // Manifest ids only. A failed manifest read here surfaces at build, not as a
  // silent missing route.
  return getMatnIds().map((id) => ({ id }));
}

const matnUrl = (locale: Locale, id: string) =>
  `${siteConfig.url}${locale === 'ar' ? '' : '/en'}/mutun/${id}`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const matn = getMatn(id);
  if (!matn) return {};
  const description = `${matn.titleAr} — ${matn.author} (${matn.era})`;
  return {
    title: matn.titleAr,
    description,
    alternates: {
      canonical: matnUrl(locale as Locale, id),
      languages: {
        ar: matnUrl('ar', id),
        en: matnUrl('en', id),
        'x-default': matnUrl('ar', id),
      },
    },
    openGraph: {
      title: matn.titleAr,
      description,
      url: matnUrl(locale as Locale, id),
      type: 'article',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
    },
  };
}

export default async function MatnReaderPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const matn = getMatn(id);
  if (!matn) notFound();
  const t = await getTranslations('mutun');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: matn.titleAr,
    author: { '@type': 'Person', name: matn.author },
    inLanguage: 'ar',
    url: matnUrl(locale as Locale, id),
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    provider: { '@id': `${siteConfig.url}/#organization` },
  };

  return (
    <Container className="py-12 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div className="mx-auto max-w-3xl">
        <Link href="/mutun" className="text-sm font-medium text-primary hover:underline">
          {t('backToMutun')}
        </Link>
        <header dir="rtl" className="font-arabic mb-8 mt-4">
          <h1 className="text-3xl font-bold text-text lg:text-4xl">{matn.titleAr}</h1>
          <p className="mt-2 text-text-muted">
            {matn.author} · {matn.era}
          </p>
        </header>
        <MatnBody matn={matn} sharhLabel={t('sharh')} />
      </div>
    </Container>
  );
}
