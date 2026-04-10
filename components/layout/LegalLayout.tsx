import { getTranslations } from 'next-intl/server';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export async function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  const t = await getTranslations('legal');

  return (
    <div className="max-w-prose mx-auto px-4 sm:px-6 py-12 lg:py-16">
      <h1 className="text-4xl font-bold text-text mb-2">{title}</h1>
      <p className="text-text-muted text-sm mb-10">
        {t('lastUpdated')}: {lastUpdated}
      </p>
      <article className="prose">{children}</article>
    </div>
  );
}
