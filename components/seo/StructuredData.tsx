import { siteConfig } from '@/lib/siteConfig';
import { serializeJsonLd } from '@/lib/jsonLd';

export function StructuredData({ locale }: { locale: string }) {
  const isAr = locale === 'ar';
  const name = isAr ? siteConfig.name.ar : siteConfig.name.en;
  const lang = isAr ? 'ar' : 'en';
  const pageUrl = isAr ? siteConfig.url : `${siteConfig.url}/en`;
  const ogImage = `${siteConfig.url}/og/og-image.png`;
  const description = isAr
    ? "دروس صوتية منظَّمة تأخذك من الصفر إلى إتقان نحو اللغة العربية الفصحى."
    : "Structured audio lessons that take you from zero to mastering Arabic grammar.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        "name": siteConfig.developer.name,
        "url": siteConfig.url,
        "logo": `${siteConfig.url}/logos/logo.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        "name": name,
        "alternateName": isAr ? siteConfig.name.en : siteConfig.name.ar,
        "url": siteConfig.url,
        "inLanguage": lang,
        "publisher": { "@id": `${siteConfig.url}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteConfig.url}/#app`,
        "name": name,
        "alternateName": isAr ? siteConfig.name.en : siteConfig.name.ar,
        "description": description,
        "url": pageUrl,
        "image": ogImage,
        "inLanguage": lang,
        "operatingSystem": "ANDROID, IOS",
        "applicationCategory": "EducationalApplication",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.7",
          "reviewCount": "2600",
          "bestRating": "5",
          "worstRating": "1"
        },
        "installUrl": [
          siteConfig.stores.googlePlay,
          siteConfig.stores.appStore
        ],
        "author": { "@id": `${siteConfig.url}/#organization` },
        "publisher": { "@id": `${siteConfig.url}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}
