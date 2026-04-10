import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Hero from '@/components/sections/Hero';
import Features from '@/components/sections/Features';
import HowItWorks from '@/components/sections/HowItWorks';
import Screenshots from '@/components/sections/Screenshots';
import Pricing from '@/components/sections/Pricing';
import Audiences from '@/components/sections/Audiences';
import FAQ from '@/components/sections/FAQ';
import FinalCTA from '@/components/sections/FinalCTA';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing.hero' });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://arabsyntax.com';

  return {
    title: t('headline'),
    description: t('valueProposition'),
    alternates: {
      canonical: locale === 'ar' ? baseUrl : `${baseUrl}/en`,
      languages: {
        ar: baseUrl,
        en: `${baseUrl}/en`,
      },
    },
  };
}

export default async function LocalePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main id="main-content">
      <Hero locale={locale} />
      <section id="features">
        <Features />
      </section>
      <section id="how-it-works">
        <HowItWorks />
      </section>
      <section id="screenshots">
        <Screenshots />
      </section>
      <section id="pricing">
        <Pricing />
      </section>
      <section id="audiences">
        <Audiences />
      </section>
      <section id="faq">
        <FAQ />
      </section>
      <FinalCTA locale={locale} />
    </main>
  );
}
