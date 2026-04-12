import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Headphones, BrainCircuit, WifiOff } from 'lucide-react';
import AppStoreBadge from '@/components/ui/AppStoreBadge';
import PlayStoreBadge from '@/components/ui/PlayStoreBadge';

interface HeroProps {
  locale: string;
}

export default async function Hero({ locale }: HeroProps) {
  const t = await getTranslations('landing.hero');

  return (
    <section className="relative bg-background py-16 lg:py-24 overflow-hidden">
      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Text block — appears at start side (right in RTL, left in LTR) */}
          <div className="flex-1 text-center lg:text-start order-3 lg:order-1">
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
            <p className="mt-4 text-sm text-text-muted flex items-center justify-center lg:justify-start gap-1">
              <span aria-hidden="true" className="text-primary">★</span>
              {t('socialProof').replace('★ ', '')}
            </p>
          </div>

          {/* Mobile-only chips — row below phone, hidden on desktop */}
          <div className="lg:hidden flex flex-wrap justify-center gap-3 order-2">
            <div className="hero-chip">
              <Headphones size={16} className="text-primary shrink-0" aria-hidden="true" />
              <div>
                <p className="text-text text-sm font-semibold leading-tight">{t('chip1Label')}</p>
                <p className="text-text-muted text-xs leading-tight">{t('chip1Detail')}</p>
              </div>
            </div>
            <div className="hero-chip">
              <BrainCircuit size={16} className="text-primary shrink-0" aria-hidden="true" />
              <div>
                <p className="text-text text-sm font-semibold leading-tight">{t('chip2Label')}</p>
                <p className="text-text-muted text-xs leading-tight">{t('chip2Detail')}</p>
              </div>
            </div>
            <div className="hero-chip">
              <WifiOff size={16} className="text-primary shrink-0" aria-hidden="true" />
              <div>
                <p className="text-text text-sm font-semibold leading-tight">{t('chip3Label')}</p>
                <p className="text-text-muted text-xs leading-tight">{t('chip3Detail')}</p>
              </div>
            </div>
          </div>

          {/* 3D floating phone mockup with annotations */}
          {/* lg:pe-[180px] = padding-end: right in LTR, left in RTL — shifts phone toward center in both directions */}
          <div className="flex-shrink-0 order-1 lg:order-2 lg:pe-[180px] [perspective:1200px]">
            <div className="relative">
              {/* Teal radial glow behind phone */}
              <div className="absolute -inset-16 rounded-full bg-primary/15 blur-3xl" />

              {/* Everything inside hero-float so phone + labels + lines move as one */}
              <div className="relative hero-float">
                {/* iPhone frame */}
                <div className="phone-frame">
                  <div className="phone-btn-silent" />
                  <div className="phone-btn-vol-up" />
                  <div className="phone-btn-vol-down" />
                  <div className="phone-btn-power" />
                  <div className="phone-dynamic-island" />
                  <div className="phone-screen">
                    <Image
                      src="/screenshots/content.png"
                      alt={t('mockupAlt')}
                      width={390}
                      height={844}
                      priority={true}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                </div>

                {/* Desktop annotation chips — absolutely positioned beside the phone */}
                <div className="hidden lg:block">
                  {/* Chip 1: Audio Lessons — upper left */}
                  <div className="hero-chip absolute top-[30px] right-[calc(100%+6px)]">
                    <Headphones size={16} className="text-primary shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-text text-sm font-semibold leading-tight">{t('chip1Label')}</p>
                      <p className="text-text-muted text-xs leading-tight">{t('chip1Detail')}</p>
                    </div>
                  </div>

                  {/* Chip 2: Interactive Quizzes — mid left */}
                  <div className="hero-chip absolute top-[200px] right-[calc(100%+6px)]">
                    <BrainCircuit size={16} className="text-primary shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-text text-sm font-semibold leading-tight">{t('chip2Label')}</p>
                      <p className="text-text-muted text-xs leading-tight">{t('chip2Detail')}</p>
                    </div>
                  </div>

                  {/* Chip 3: Offline Access — bottom right (LTR) / bottom left (RTL) */}
                  <div className="hero-chip hero-chip-end absolute bottom-[80px] left-[calc(100%+6px)]">
                    <WifiOff size={16} className="text-primary shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-text text-sm font-semibold leading-tight">{t('chip3Label')}</p>
                      <p className="text-text-muted text-xs leading-tight">{t('chip3Detail')}</p>
                    </div>
                  </div>
                </div>

                {/* Reflection highlight */}
                <div className="absolute top-0 left-0 w-[260px] h-[530px] rounded-[3.2rem] bg-gradient-to-br from-white/[0.06] via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
