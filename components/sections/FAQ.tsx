import { getTranslations } from 'next-intl/server';
import { ChevronDown } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

const FAQ_KEYS = ['freePaid', 'offline', 'ios', 'legacy', 'exam', 'update'] as const;

export default async function FAQ() {
  const t = await getTranslations('landing.faq');

  return (
    <section id="faq" className="py-16 lg:py-24 bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          heading={t('heading')}
          subtitle={t('subtitle')}
          className="mb-12 text-center"
        />
        <div className="divide-y divide-border">
          {FAQ_KEYS.map((key) => (
            <details key={key} className="group py-1">
              <summary className="cursor-pointer flex justify-between items-center py-4 text-text font-semibold list-none gap-4">
                <span>{t(`items.${key}.question`)}</span>
                <ChevronDown
                  className="text-text-muted shrink-0 transition-transform duration-200 group-open:rotate-180"
                  size={20}
                  aria-hidden="true"
                />
              </summary>
              <p className="text-text-muted pb-4 leading-relaxed">
                {t(`items.${key}.answer`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
