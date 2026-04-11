import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import AppStoreBadge from '@/components/ui/AppStoreBadge';
import PlayStoreBadge from '@/components/ui/PlayStoreBadge';

interface HeroProps {
  locale: string;
}

export default async function Hero({ locale }: HeroProps) {
  const t = await getTranslations('landing.hero');

  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Text block — appears at start side (right in RTL, left in LTR) */}
          <div className="flex-1 text-center lg:text-start order-2 lg:order-1">
            <p className="text-primary font-semibold text-lg mb-3">{t('tagline')}</p>
            <h1 className="text-5xl lg:text-6xl font-bold text-text mb-6 leading-tight">
              {t('headline')}
            </h1>
            <p className="text-text-muted text-xl mb-8 max-w-lg mx-auto lg:mx-0">
              {t('valueProposition')}
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <AppStoreBadge locale={locale} />
              <PlayStoreBadge locale={locale} />
            </div>
          </div>

          {/* Phone mockup — appears at end side (left in RTL, right in LTR) */}
          <div className="flex-shrink-0 order-1 lg:order-2">
            <Image
              src="/screenshots/lesson.png"
              alt={t('mockupAlt')}
              width={390}
              height={844}
              priority={true}
              className="rounded-3xl shadow-2xl max-h-[500px] w-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
