import { getTranslations } from 'next-intl/server';
import { Headphones, BookOpen, BrainCircuit, GraduationCap, PenLine, WifiOff } from 'lucide-react';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import AnimatedSection from '@/components/ui/AnimatedSection';

const FEATURE_ICONS = {
  audioLessons: Headphones,
  structured: BookOpen,
  quizzes: BrainCircuit,
  examPrep: GraduationCap,
  irab: PenLine,
  offline: WifiOff,
} as const;

type FeatureKey = keyof typeof FEATURE_ICONS;

const FEATURE_KEYS: FeatureKey[] = [
  'audioLessons',
  'structured',
  'quizzes',
  'examPrep',
  'irab',
  'offline',
];

export default async function Features() {
  const t = await getTranslations('landing.features');

  return (
    <section id="features" className="py-16 lg:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          heading={t('heading')}
          subtitle={t('subtitle')}
          className="mb-12 text-center"
        />
        <AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURE_KEYS.map((key) => {
              const Icon = FEATURE_ICONS[key];
              return (
                <Card key={key}>
                  <Icon className="text-primary mb-4" size={32} aria-hidden="true" />
                  <h3 className="text-text font-semibold text-xl mb-2">
                    {t(`cards.${key}.title`)}
                  </h3>
                  <p className="text-text-muted">
                    {t(`cards.${key}.description`)}
                  </p>
                </Card>
              );
            })}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
