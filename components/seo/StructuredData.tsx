import { siteConfig } from '@/lib/siteConfig';

export function StructuredData({ locale }: { locale: string }) {
  const isAr = locale === 'ar';
  const name = isAr ? siteConfig.name.ar : siteConfig.name.en;
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": name,
    "alternateName": isAr ? siteConfig.name.en : siteConfig.name.ar,
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
    "author": {
      "@type": "Organization",
      "name": siteConfig.developer.name
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
