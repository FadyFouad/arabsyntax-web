import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <section className="bg-background py-24 lg:py-32">
      <Container className="flex flex-col items-center text-center">
        <p className="text-7xl lg:text-8xl font-bold text-primary mb-4">404</p>
        <h1 className="text-3xl lg:text-4xl font-bold text-text mb-4">{t('title')}</h1>
        <p className="text-text-muted text-lg max-w-md mb-8">{t('description')}</p>
        <Link
          href="/"
          className="px-6 py-2 bg-primary text-primary-fg rounded-xl font-medium hover:bg-primary-hover transition-colors"
        >
          {t('backHome')}
        </Link>
      </Container>
    </section>
  );
}
