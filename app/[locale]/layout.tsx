import '../globals.css';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Cairo, Inter } from 'next/font/google';
import Script from 'next/script';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { routing } from '@/i18n/routing';
import { siteConfig } from '@/lib/siteConfig';
import { themeInitScript } from '@/lib/theme';

const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const name = isAr ? siteConfig.name.ar : siteConfig.name.en;
  const description = isAr
    ? "دروس صوتية منظَّمة تأخذك من الصفر إلى إتقان نحو اللغة العربية الفصحى."
    : "Structured audio lessons that take you from zero to mastering Arabic grammar.";

  const keywords = isAr
    ? ['النحو الكافي', 'تعلم النحو', 'الإعراب', 'اللغة العربية', 'نحو وصرف', 'دروس نحو صوتية', 'إعراب الجمل', 'قواعد اللغة العربية']
    : ['Arabic grammar', 'learn Arabic', 'Arabic syntax', 'nahw', 'irab', 'Arabic language app', 'Arabic grammar lessons', 'Arabic grammar app'];

  const ogImage = `${siteConfig.url}/og/og-image.png`;

  return {
    metadataBase: new URL(siteConfig.url),
    applicationName: name,
    title: {
      template: `%s | ${name}`,
      default: name,
    },
    description,
    keywords,
    authors: [{ name: siteConfig.developer.name }],
    creator: siteConfig.developer.name,
    publisher: siteConfig.developer.name,
    category: 'education',
    formatDetection: { telephone: false, email: false, address: false },
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: name, statusBarStyle: 'black-translucent' as const },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large' as const,
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: name,
      description,
      siteName: name,
      url: `${siteConfig.url}${isAr ? '' : '/en'}`,
      locale: isAr ? 'ar_AR' : 'en_US',
      alternateLocale: isAr ? 'en_US' : 'ar_AR',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${name} — ${isAr ? 'تعلَّم النحو العربي' : 'Learn Arabic Grammar'}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: name,
      description,
      images: [ogImage],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const isAr = locale === 'ar';

  return (
    <html
      lang={locale}
      dir={isAr ? 'rtl' : 'ltr'}
      className={`${cairo.variable} ${inter.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className={`${isAr ? 'font-arabic' : 'font-english'} min-h-screen flex flex-col bg-background text-text`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
