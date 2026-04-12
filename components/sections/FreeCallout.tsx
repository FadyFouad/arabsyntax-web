import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import PlayStoreBadge from '@/components/ui/PlayStoreBadge';
import AppStoreBadge from '@/components/ui/AppStoreBadge';

export default async function FreeCallout({ locale }: { locale: string }) {
  const t = await getTranslations('landing.freeCallout');

  return (
    <section className="bg-surface py-16 lg:py-24 border-y border-border">
      <Container className="text-center">
        <SectionHeading
          heading={t('heading')}
          subtitle={t('subtitle')}
          className="mx-auto"
        />
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <AppStoreBadge locale={locale} />
          <PlayStoreBadge locale={locale} />
        </div>
      </Container>
    </section>
  );
}
