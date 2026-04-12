import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { siteConfig } from '@/lib/siteConfig';
import { featureFlags } from '@/lib/featureFlags';
import { StructuredData } from '@/components/seo/StructuredData';
import FreeCallout from '@/components/sections/FreeCallout';
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

  const isAr = locale === 'ar';
  const name = isAr ? siteConfig.name.ar : siteConfig.name.en;
  return {
    title: t('headline'),
    description: t('valueProposition'),
    alternates: {
      canonical: locale === 'ar' ? siteConfig.url : `${siteConfig.url}/en`,
      languages: {
        ar: siteConfig.url,
        en: `${siteConfig.url}/en`,
      },
    },
    openGraph: {
      title: t('headline'),
      description: t('valueProposition'),
      siteName: name,
      url: `${siteConfig.url}${isAr ? '' : '/en'}`,
      locale: isAr ? 'ar_AR' : 'en_US',
      type: 'website',
      images: [
        {
          url: `${siteConfig.url}/og/og-image.png`,
          width: 1200,
          height: 630,
          alt: `${name} — ${t('tagline')}`,
        },
      ],
    },
  };
}

export default async function LocalePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <>
      <StructuredData locale={locale} />
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
      {featureFlags.showPricing ? (
        <section id="pricing">
          <Pricing />
        </section>
      ) : (
        <FreeCallout locale={locale} />
      )}
      <section id="audiences">
        <Audiences />
      </section>
      <section id="faq">
        <FAQ />
      </section>
      <FinalCTA locale={locale} />
    </>
  );
}
