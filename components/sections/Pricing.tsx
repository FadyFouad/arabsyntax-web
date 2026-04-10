import { getTranslations } from 'next-intl/server';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import AnimatedSection from '@/components/ui/AnimatedSection';

// TODO: Replace with the real Google Play Store listing URL before launch
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.arabsyntax.app';

const PAID_TIERS = ['monthly', 'yearly', 'lifetime'] as const;
type PaidTier = typeof PAID_TIERS[number];

export default async function Pricing() {
  const t = await getTranslations('landing.pricing');
  const freeFeatures = t.raw('tiers.free.features') as string[];

  return (
    <section id="pricing" className="py-16 lg:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          heading={t('heading')}
          subtitle={t('subtitle')}
          className="mb-12 text-center"
        />
        <AnimatedSection>
          {/* Free tier banner */}
          <Card className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-text font-bold text-2xl mb-1">{t('tiers.free.name')}</h3>
              <p className="text-primary font-semibold text-xl">{t('tiers.free.price')}</p>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {freeFeatures.map((feature: string, i: number) => (
                <li key={i} className="text-text-muted text-sm flex items-center gap-1">
                  <span className="text-success" aria-hidden="true">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 bg-surface-elevated text-text font-semibold py-3 px-6 rounded-xl hover:bg-border transition-colors"
            >
              {t('tiers.free.cta')}
            </a>
          </Card>

          {/* Paid tiers grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PAID_TIERS.map((tierKey) => {
              const isYearly = tierKey === 'yearly';
              const features = t.raw(`tiers.${tierKey}.features`) as string[];
              return (
                <Card
                  key={tierKey}
                  className={isYearly ? 'border-2 border-primary relative' : ''}
                >
                  {isYearly && (
                    <span className="absolute -top-3 start-1/2 -translate-x-1/2 bg-primary text-primary-fg text-xs font-bold px-3 py-1 rounded-full">
                      {t('tiers.yearly.popularLabel')}
                    </span>
                  )}
                  <h3 className="text-text font-bold text-xl mb-2">
                    {t(`tiers.${tierKey}.name`)}
                  </h3>
                  <p className="text-primary font-semibold text-2xl mb-6">
                    {t(`tiers.${tierKey}.price`)}
                  </p>
                  <ul className="space-y-2 mb-8">
                    {features.map((feature: string, i: number) => (
                      <li key={i} className="text-text-muted text-sm flex items-start gap-2">
                        <span className="text-success mt-0.5 shrink-0" aria-hidden="true">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block text-center font-semibold py-3 px-6 rounded-xl transition-colors ${
                      isYearly
                        ? 'bg-primary text-primary-fg hover:bg-primary-hover'
                        : 'bg-surface-elevated text-text hover:bg-border'
                    }`}
                  >
                    {t(`tiers.${tierKey}.cta`)}
                  </a>
                </Card>
              );
            })}
          </div>

          {/* Legacy purchaser note */}
          <p className="text-text-muted text-sm text-center mt-8">
            {t('legacyNote')}
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
