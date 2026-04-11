import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import ContactForm from '@/components/forms/ContactForm';
import FAQ from '@/components/sections/FAQ';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'support' });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://arabsyntax.com';

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: locale === 'ar' ? `${baseUrl}/support` : `${baseUrl}/en/support`,
      languages: {
        ar: `${baseUrl}/support`,
        en: `${baseUrl}/en/support`,
      },
    },
  };
}

export default async function SupportPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('support');

  return (
    <div className="py-16 lg:py-24">
      <Container className="max-w-3xl mb-24">
        <SectionHeading
          heading={t('title')}
          subtitle={t('description')}
          className="text-center"
        />
        <p className="text-center text-text-muted mb-12">{t('responseTime')}</p>
        
        <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border shadow-sm">
          <ContactForm />
        </div>

        <div className="mt-8 text-center text-text-muted">
          <span>{t('directEmail.label')} </span>
          <a href={`mailto:${process.env.SUPPORT_EMAIL || 'support@arabsyntax.com'}`} className="text-primary underline hover:text-primary-hover transition-colors font-medium">
            {process.env.SUPPORT_EMAIL || 'support@arabsyntax.com'}
          </a>
        </div>
      </Container>
      
      <div id="faq">
        <FAQ />
      </div>
    </div>
  );
}