import { getTranslations } from 'next-intl/server';

export default async function LocalePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations('common');
  
  return (
    <main id="main-content">
      <h1>{t('appNameAr')}</h1>
    </main>
  );
}