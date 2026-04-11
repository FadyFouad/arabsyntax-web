import Image from 'next/image';

const APP_STORE_URL =
  'https://apps.apple.com/us/app/%D8%A7%D9%84%D9%86%D8%AD%D9%88-%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/id6448959921?itscg=30200&itsct=apps_box_badge&mttnsubad=6448959921';

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
      href={APP_STORE_URL}
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
