import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import I3rabWords from '@/components/i3rab/I3rabWords';
import { siteConfig } from '@/lib/siteConfig';
import { getAllI3rabSlugs, getI3rabEntry, type I3rabEntry } from '@/lib/i3rab/loader';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = false;

// Bilingual routing (like lessons): pages exist at /i3rab/* and /en/i3rab/*.
export function generateStaticParams() {
  return getAllI3rabSlugs().map((slug) => ({ slug }));
}

// The content is Arabic on both locales, so the Arabic URL is the canonical
// original (avoids duplicate-content). Per-locale URL is only used for OG/page url.
const arUrl = (slug: string) => `${siteConfig.url}/i3rab/${slug}`;
const localeUrl = (locale: string, slug: string) =>
  `${siteConfig.url}${locale === 'ar' ? '' : '/en'}/i3rab/${slug}`;

function metaDescription(e: I3rabEntry): string {
  const base = e.explanation.trim()
    ? e.explanation
    : `${e.sentence}${e.lessonName ? ` — ${e.lessonName}` : ''}`;
  const clean = base.replace(/\s+/g, ' ').trim();
  return clean.length > 160 ? `${clean.slice(0, 157)}…` : clean;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const e = getI3rabEntry(slug);
  if (!e) return {};
  const description = metaDescription(e);
  return {
    title: e.sentence,
    description,
    alternates: {
      // Arabic is the canonical original on BOTH locales (same Arabic content).
      canonical: arUrl(slug),
      languages: {
        ar: arUrl(slug),
        en: localeUrl('en', slug),
        'x-default': arUrl(slug),
      },
    },
    openGraph: {
      title: e.sentence,
      description,
      url: localeUrl(locale, slug),
      type: 'article',
      locale: 'ar_AR', // content is Arabic regardless of UI locale
    },
  };
}

export default async function I3rabPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const e = getI3rabEntry(slug);
  if (!e) notFound();
  const t = await getTranslations('i3rab');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: e.sentence,
    inLanguage: 'ar',
    url: arUrl(slug),
    description: metaDescription(e),
    learningResourceType: 'إعراب',
    about: 'النحو العربي',
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    provider: { '@id': `${siteConfig.url}/#organization` },
  };

  return (
    <Container className="py-12 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-3xl">
        <Link href="/i3rab" className="text-sm font-medium text-primary hover:underline">
          {t('backToIndex')}
        </Link>
        <I3rabWords
          entry={e}
          labels={{ words: t('words'), explanation: t('explanation'), relatedLesson: t('relatedLesson') }}
        />
      </div>
    </Container>
  );
}
