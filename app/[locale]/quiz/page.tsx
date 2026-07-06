import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import { siteConfig } from '@/lib/siteConfig';
import QuizApp from '@/components/quiz/QuizApp';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const quizUrl = (locale: string) => `${siteConfig.url}${locale === 'ar' ? '' : '/en'}/quiz`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'quiz' });
  const url = quizUrl(locale);

  return {
    title: t('pageTitle'),
    description: t('pageSubtitle'),
    alternates: {
      canonical: url,
      languages: {
        ar: quizUrl('ar'),
        en: quizUrl('en'),
        'x-default': quizUrl('ar'),
      },
    },
    openGraph: {
      title: t('pageTitle'),
      description: t('pageSubtitle'),
      url,
      type: 'website',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
    },
  };
}

export default async function QuizPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('quiz');

  // The quiz is Arabic-only and fully RTL regardless of the site locale, so the
  // content region forces its own direction + Arabic font (the /en document is ltr).
  return (
    <div dir="rtl" className="font-arabic">
      <Container className="py-12 lg:py-16">
        <SectionHeading heading={t('pageTitle')} subtitle={t('pageSubtitle')} className="mb-10 text-center" />
        <QuizApp />
      </Container>
    </div>
  );
}
