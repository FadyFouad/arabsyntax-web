import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import { MatnCard } from '@/components/mutun/MatnCard';
import { siteConfig } from '@/lib/siteConfig';
import { getMutunIndex } from '@/lib/mutun/loader';
import { type Locale } from '@/lib/lessons/loader';
import { serializeJsonLd } from '@/lib/jsonLd';
import type { ManifestEntry } from '@/lib/mutun/schema';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const indexUrl = (locale: Locale) => `${siteConfig.url}${locale === 'ar' ? '' : '/en'}/mutun`;
const matnUrl = (locale: Locale, id: string) => `${indexUrl(locale)}/${id}`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'mutun' });
  const url = indexUrl(locale as Locale);
  return {
    title: t('indexTitle'),
    description: t('indexSubtitle'),
    alternates: {
      canonical: url,
      languages: { ar: indexUrl('ar'), en: indexUrl('en'), 'x-default': indexUrl('ar') },
    },
    openGraph: {
      title: t('indexTitle'),
      description: t('indexSubtitle'),
      url,
      type: 'website',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
    },
  };
}

export default async function MutunIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('mutun');

  // Distinguish a real load/parse failure (ERROR state + retry) from a valid but
  // empty manifest (EMPTY state). getMutunIndex throws on the former, returns []
  // on the latter — never inventing content to fill a gap.
  let mutun: ManifestEntry[] | null = null;
  try {
    mutun = getMutunIndex();
  } catch {
    mutun = null;
  }

  if (mutun === null) {
    return (
      <Container className="py-12 lg:py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-error/40 bg-error/5 p-8 text-center">
          <h1 className="text-xl font-bold text-text">{t('errorTitle')}</h1>
          <p className="mt-2 text-text-muted">{t('errorBody')}</p>
          <Link
            href="/mutun"
            className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-primary-fg hover:bg-primary-hover"
          >
            {t('retry')}
          </Link>
        </div>
      </Container>
    );
  }

  if (mutun.length === 0) {
    return (
      <Container className="py-12 lg:py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface/50 p-8 text-center">
          <p className="text-lg font-medium text-text-muted">{t('emptyTitle')}</p>
        </div>
      </Container>
    );
  }

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: mutun.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.titleAr,
      url: matnUrl(locale as Locale, m.id),
    })),
  };

  return (
    <Container className="py-12 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemList) }} />
      <SectionHeading heading={t('indexTitle')} subtitle={t('indexSubtitle')} className="mb-10" />
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {mutun.map((entry) => (
          <li key={entry.id}>
            <MatnCard entry={entry} levelLabel={t(`level.${entry.level}`)} />
          </li>
        ))}
      </ul>
    </Container>
  );
}
