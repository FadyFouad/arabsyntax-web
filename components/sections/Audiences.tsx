import { getTranslations } from 'next-intl/server';
import { GraduationCap, BookHeart } from 'lucide-react';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default async function Audiences() {
  const t = await getTranslations('landing.audiences');

  return (
    <section id="audiences" className="py-16 lg:py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          heading={t('heading')}
          subtitle={t('subtitle')}
          className="mb-12 text-center"
        />
        <AnimatedSection>
          <div className="flex flex-col md:flex-row gap-6">
            <Card className="flex-1">
              <GraduationCap className="text-primary mb-4" size={40} aria-hidden="true" />
              <h3 className="text-text font-bold text-2xl mb-3">{t('students.heading')}</h3>
              <p className="text-text-muted">{t('students.description')}</p>
            </Card>
            <Card className="flex-1">
              <BookHeart className="text-primary mb-4" size={40} aria-hidden="true" />
              <h3 className="text-text font-bold text-2xl mb-3">{t('learners.heading')}</h3>
              <p className="text-text-muted">{t('learners.description')}</p>
            </Card>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
