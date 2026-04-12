import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Cairo, Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });


import { siteConfig } from '@/lib/siteConfig';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const name = isAr ? siteConfig.name.ar : siteConfig.name.en;
  const description = isAr 
    ? "دروس صوتية منظَّمة تأخذك من الصفر إلى إتقان نحو اللغة العربية الفصحى." 
    : "Structured audio lessons that take you from zero to mastering Arabic grammar.";
    
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      template: `%s | ${name}`,
      default: name,
    },
    description,
    openGraph: {
      title: name,
      description,
      siteName: name,
      url: `${siteConfig.url}${isAr ? '' : '/en'}`,
      locale: isAr ? 'ar_AR' : 'en_US',
      type: 'website',
      images: [
        {
          url: `${siteConfig.url}/og/og-image.png`,
          width: 1200,
          height: 630,
          alt: `${name} — ${isAr ? 'تعلَّم النحو العربي' : 'Learn Arabic Grammar'}`,
        },
      ],
    },
  };
}

export function generateStaticParams() {
  return [{ locale: 'ar' }, { locale: 'en' }];
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <div lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${cairo.variable} ${inter.variable} ${locale === 'ar' ? 'font-arabic' : 'font-english'} min-h-screen flex flex-col bg-background text-text`}>
      <NextIntlClientProvider messages={messages}>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </NextIntlClientProvider>
    </div>
  );
}