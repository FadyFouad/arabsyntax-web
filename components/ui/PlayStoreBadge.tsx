import Image from 'next/image';

import { siteConfig } from '@/lib/siteConfig';

interface PlayStoreBadgeProps {
  locale: string;
  className?: string;
}

export default function PlayStoreBadge({ locale, className }: PlayStoreBadgeProps) {
  const isArabic = locale === 'ar';
  const badgeSrc = isArabic
    ? '/badges/google-play-ar.png'
    : '/badges/google-play-en.png';
  const altText = isArabic
    ? 'متوفر على Google Play'
    : 'Get it on Google Play';

  return (
    <a
      href={siteConfig.stores.googlePlay}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={altText}
    >
      <Image
        src={badgeSrc}
        alt={altText}
        width={202}
        height={60}
        priority={false}
        className="h-[60px] w-auto"
      />
    </a>
  );
}
