import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { MatnUnit } from '@/components/mutun/MatnBody';
import { UnitPager } from '@/components/mutun/UnitPager';
import { siteConfig } from '@/lib/siteConfig';
import { getMatn, getMatnEntry, getPagedMatnIds } from '@/lib/mutun/loader';
import { toArabicIndic } from '@/lib/mutun/numerals';
import { findPagedUnit, pagedUnits } from '@/lib/mutun/units';
import { type Locale } from '@/lib/lessons/loader';
import { serializeJsonLd } from '@/lib/jsonLd';

interface PageProps {
  params: Promise<{ locale: string; id: string; unit: string }>;
}

export function generateStaticParams() {
  // One page per باب of each paged matn, keyed by the باب's stable slug.
  return getPagedMatnIds().flatMap((id) => {
    const matn = getMatn(id);
    return matn ? pagedUnits(matn).map((u) => ({ id, unit: u.slug })) : [];
  });
}

const matnUrl = (locale: Locale, id: string) => `${siteConfig.url}${locale === 'ar' ? '' : '/en'}/mutun/${id}`;
const unitUrl = (locale: Locale, id: string, slug: string) => `${matnUrl(locale, id)}/${slug}`;

/** The باب for these params, or null: an unknown slug, or a matn that isn't paged. */
function load(id: string, slug: string) {
  if (getMatnEntry(id)?.paged !== true) return null;
  const matn = getMatn(id);
  const found = matn ? findPagedUnit(matn, slug) : null;
  return matn && found ? { matn, ...found } : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id, unit: slug } = await params;
  const data = load(id, slug);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: 'mutun' });
  const { matn, current } = data;
  const num = (n: number) => (locale === 'ar' ? toArabicIndic(n) : String(n));
  const unitTitle = current.unit.title ?? num(current.unit.order);
  const verses = { from: num(current.firstVerse), to: num(current.lastVerse) };
  // A title shared by several أبواب (the bare «فصل») gets its verse range, so
  // no two pages share a <title>.
  const shared = matn.units.filter((u) => u.title === current.unit.title).length > 1;
  const title = shared
    ? t('unitMetaTitleWithVerses', { matn: matn.titleAr, unit: unitTitle, ...verses })
    : t('unitMetaTitle', { matn: matn.titleAr, unit: unitTitle });
  const description = t('unitMetaDescription', { matn: matn.titleAr, unit: unitTitle, ...verses });
  return {
    // absolute: the باب title already names the matn, so skip the site suffix.
    title: { absolute: title },
    description,
    alternates: {
      canonical: unitUrl(locale as Locale, id, slug),
      languages: {
        ar: unitUrl('ar', id, slug),
        en: unitUrl('en', id, slug),
        'x-default': unitUrl('ar', id, slug),
      },
    },
    openGraph: {
      title,
      description,
      url: unitUrl(locale as Locale, id, slug),
      type: 'article',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
    },
  };
}

export default async function MatnUnitPage({ params }: PageProps) {
  const { locale, id, unit: slug } = await params;
  setRequestLocale(locale);
  const data = load(id, slug);
  if (!data) notFound();
  const t = await getTranslations('mutun');
  const { matn, current, previous, next } = data;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Chapter',
    name: current.unit.title,
    inLanguage: 'ar',
    url: unitUrl(locale as Locale, id, slug),
    isPartOf: { '@type': 'Book', name: matn.titleAr, url: matnUrl(locale as Locale, id) },
  };

  return (
    <Container className="py-12 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div className="mx-auto max-w-3xl">
        <Link href={`/mutun/${id}`} className="text-sm font-medium text-primary hover:underline">
          {t('backToIndex')}
        </Link>
        <p dir="rtl" className="font-arabic mb-6 mt-4 text-text-muted">
          {matn.titleAr}
        </p>
        <MatnUnit unit={current.unit} type={matn.type} sharhLabel={t('sharh')} />
        <UnitPager
          matnId={id}
          previous={previous}
          next={next}
          labels={{ previous: t('previousUnit'), next: t('nextUnit'), index: t('backToIndex') }}
        />
      </div>
    </Container>
  );
}
