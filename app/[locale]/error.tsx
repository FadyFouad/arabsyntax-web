'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="bg-background py-24 lg:py-32">
      <Container className="flex flex-col items-center text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-text mb-4">{t('title')}</h1>
        <p className="text-text-muted text-lg max-w-md mb-8">{t('description')}</p>
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2 bg-primary text-primary-fg rounded-xl font-medium hover:bg-primary-hover transition-colors"
        >
          {t('retry')}
        </button>
      </Container>
    </section>
  );
}
