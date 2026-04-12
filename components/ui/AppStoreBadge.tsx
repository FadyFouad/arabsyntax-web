import Image from 'next/image';

import { siteConfig } from '@/lib/siteConfig';

interface AppStoreBadgeProps {
  locale: string;
  className?: string;
}

export default function AppStoreBadge({ locale, className }: AppStoreBadgeProps) {
  const isArabic = locale === 'ar';
  const badgeSrc = isArabic
    ? '/badges/app-store-ar.svg'
    : '/badges/app-store-en.svg';
  const altText = isArabic
    ? 'حمّل من App Store'
    : 'Download on the App Store';

  return (
    <a
      href={siteConfig.stores.appStore}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={altText}
    >
      <Image
        src={badgeSrc}
        alt={altText}
        width={200}
        height={67}
        priority={false}
        className="h-[60px] w-auto"
      />
    </a>
  );
}
