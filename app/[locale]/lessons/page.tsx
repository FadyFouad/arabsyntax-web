import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import Card from '@/components/ui/Card';
import { siteConfig } from '@/lib/siteConfig';
import { getLessonIndex, type Locale } from '@/lib/lessons/loader';
import { getTreeLayout } from '@/lib/lessons/tree/loader';
import { serializeJsonLd } from '@/lib/jsonLd';
import LessonsView from '@/components/lessons/LessonsView';
import LessonStatusBadge from '@/components/lessons/LessonStatusBadge';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const indexUrl = (locale: Locale) => `${siteConfig.url}${locale === 'ar' ? '' : '/en'}/lessons`;
const lessonUrl = (locale: Locale, slug: string) => `${indexUrl(locale)}/${slug}`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'lessons' });
  const url = indexUrl(locale as Locale);

  return {
    title: t('indexTitle'),
    description: t('indexSubtitle'),
    alternates: {
      canonical: url,
      languages: {
        ar: indexUrl('ar'),
        en: indexUrl('en'),
        'x-default': indexUrl('ar'),
      },
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

export default async function LessonsIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('lessons');
  const lessons = getLessonIndex(locale as Locale);
  const treeLayout = getTreeLayout();

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: lessons.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: l.title,
      url: lessonUrl(locale as Locale, l.slug),
    })),
  };

  return (
    <Container className="py-12 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemList) }} />
      <SectionHeading heading={t('indexTitle')} subtitle={t('indexSubtitle')} className="mb-10" />
      <LessonsView
        tree={treeLayout}
        rtl={locale === 'ar'}
        listSlot={
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((l) => (
              <li key={l.slug}>
                <Link href={`/lessons/${l.slug}`} className="block h-full">
                  <Card className="flex h-full flex-col transition-colors hover:border-primary">
                    <h2 className="text-xl font-semibold text-text">{l.title}</h2>
                    <LessonStatusBadge lessonId={l.slug} />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        }
      />
    </Container>
  );
}
