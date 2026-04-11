import { getTranslations } from 'next-intl/server';
import AppStoreBadge from '@/components/ui/AppStoreBadge';
import PlayStoreBadge from '@/components/ui/PlayStoreBadge';
import SectionHeading from '@/components/ui/SectionHeading';

interface FinalCTAProps {
  locale: string;
}

export default async function FinalCTA({ locale }: FinalCTAProps) {
  const t = await getTranslations('landing.finalCta');

  return (
    <section className="bg-surface-elevated py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <SectionHeading
          heading={t('headline')}
          subtitle={t('subtitle')}
          className="mb-8"
        />
        <div className="flex flex-wrap items-center justify-center gap-4">
          <AppStoreBadge locale={locale} />
          <PlayStoreBadge locale={locale} />
        </div>
      </div>
    </section>
  );
}
