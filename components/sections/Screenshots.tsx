import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import SectionHeading from '@/components/ui/SectionHeading';

const SCREENSHOTS = [
  { key: 'home', src: '/screenshots/home.webp' },
  { key: 'lesson', src: '/screenshots/lesson.webp' },
  { key: 'quiz', src: '/screenshots/quiz.webp' },
  { key: 'analysis', src: '/screenshots/analysis.webp' },
] as const;

export default async function Screenshots() {
  const t = await getTranslations('landing.screenshots');

  return (
    <section id="screenshots" className="py-16 lg:py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          heading={t('heading')}
          subtitle={t('subtitle')}
          className="mb-12 text-center"
        />

        {/* Mobile: horizontal scroll-snap carousel */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 lg:hidden">
          {SCREENSHOTS.map(({ key, src }) => (
            <div key={key} className="snap-center shrink-0">
              <Image
                src={src}
                alt={t(`alts.${key}`)}
                width={800}
                height={1421}
                className="rounded-2xl max-h-[500px] w-auto"
              />
            </div>
          ))}
        </div>

        {/* Desktop: static grid */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6">
          {SCREENSHOTS.map(({ key, src }) => (
            <div key={key} className="flex justify-center">
              <Image
                src={src}
                alt={t(`alts.${key}`)}
                width={800}
                height={1421}
                className="rounded-2xl max-h-[500px] w-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
