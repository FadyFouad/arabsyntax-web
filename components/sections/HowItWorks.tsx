import { getTranslations } from 'next-intl/server';
import SectionHeading from '@/components/ui/SectionHeading';

export default async function HowItWorks() {
  const t = await getTranslations('landing.howItWorks');

  const steps = [1, 2, 3] as const;

  return (
    <section id="how-it-works" className="py-16 lg:py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          heading={t('heading')}
          subtitle={t('subtitle')}
          className="mb-12 text-center"
        />
        <div className="flex flex-col md:flex-row gap-8">
          {steps.map((step) => (
            <div key={step} className="flex-1 text-center">
              <span className="text-primary text-6xl font-bold block mb-4" aria-hidden="true">
                {step}
              </span>
              <h3 className="text-text font-semibold text-xl mb-3">
                {t(`steps.${step}.title`)}
              </h3>
              <p className="text-text-muted">
                {t(`steps.${step}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
