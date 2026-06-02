import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import Card from '@/components/ui/Card';
import { siteConfig } from '@/lib/siteConfig';
import { getI3rabIndex } from '@/lib/i3rab/loader';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const indexUrl = `${siteConfig.url}/i3rab`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'ar') return {};
  const t = await getTranslations({ locale, namespace: 'i3rab' });
  return {
    title: t('indexTitle'),
    description: t('indexSubtitle'),
    alternates: {
      canonical: indexUrl,
      languages: { ar: indexUrl, 'x-default': indexUrl },
    },
    openGraph: {
      title: t('indexTitle'),
      description: t('indexSubtitle'),
      url: indexUrl,
      type: 'website',
      locale: 'ar_AR',
    },
  };
}

export default async function I3rabIndexPage({ params }: PageProps) {
  const { locale } = await params;
  if (locale !== 'ar') notFound(); // Arabic-only section
  setRequestLocale(locale);
  const t = await getTranslations('i3rab');
  const groups = getI3rabIndex();

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: groups
      .flatMap((g) => g.items)
      .map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: e.sentence,
        url: `${siteConfig.url}/i3rab/${e.slug}`,
      })),
  };

  return (
    <Container className="py-12 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <SectionHeading heading={t('indexTitle')} subtitle={t('indexSubtitle')} className="mb-10" />
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.lessonName ?? 'misc'}>
            <h2 className="mb-4 text-2xl font-bold text-text">
              {g.lessonName ? (
                g.lessonHref ? (
                  <Link href={g.lessonHref} className="hover:text-primary">
                    {g.lessonName}
                  </Link>
                ) : (
                  g.lessonName
                )
              ) : (
                t('misc')
              )}
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((e) => (
                <li key={e.slug}>
                  <Link href={`/i3rab/${e.slug}`} className="block h-full">
                    <Card className="h-full transition-colors hover:border-primary">
                      <p className="text-lg font-semibold text-text">{e.sentence}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Container>
  );
}
