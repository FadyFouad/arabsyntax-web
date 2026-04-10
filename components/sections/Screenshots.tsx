import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import SectionHeading from '@/components/ui/SectionHeading';

const SCREENSHOTS = [
  { key: 'lesson', src: '/screenshots/lesson.png' },
  { key: 'quiz', src: '/screenshots/quiz.png' },
  { key: 'examples', src: '/screenshots/examples.png' },
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
                width={390}
                height={844}
                className="rounded-2xl max-h-[500px] w-auto"
              />
            </div>
          ))}
        </div>

        {/* Desktop: static grid */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {SCREENSHOTS.map(({ key, src }) => (
            <div key={key} className="flex justify-center">
              <Image
                src={src}
                alt={t(`alts.${key}`)}
                width={390}
                height={844}
                className="rounded-2xl max-h-[500px] w-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
