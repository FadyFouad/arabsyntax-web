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

// Next crosses these slugs with both locales; the Arabic-only guard below makes
// every /en/i3rab/* render a 404 (not advertised in sitemap/hreflang/nav).
export function generateStaticParams() {
  return getAllI3rabSlugs().map((slug) => ({ slug }));
}

const url = (slug: string) => `${siteConfig.url}/i3rab/${slug}`;

function metaDescription(e: I3rabEntry): string {
  const base = e.explanation.trim()
    ? e.explanation
    : `${e.sentence}${e.lessonName ? ` — ${e.lessonName}` : ''}`;
  const clean = base.replace(/\s+/g, ' ').trim();
  return clean.length > 160 ? `${clean.slice(0, 157)}…` : clean;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (locale !== 'ar') return {};
  const e = getI3rabEntry(slug);
  if (!e) return {};
  const description = metaDescription(e);
  return {
    title: e.sentence,
    description,
    alternates: {
      canonical: url(slug),
      languages: { ar: url(slug), 'x-default': url(slug) },
    },
    openGraph: {
      title: e.sentence,
      description,
      url: url(slug),
      type: 'article',
      locale: 'ar_AR',
    },
  };
}

export default async function I3rabPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (locale !== 'ar') notFound();
  setRequestLocale(locale);
  const e = getI3rabEntry(slug);
  if (!e) notFound();
  const t = await getTranslations('i3rab');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: e.sentence,
    inLanguage: 'ar',
    url: url(slug),
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
