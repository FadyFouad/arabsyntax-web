import Image from 'next/image';

// TODO: Replace with the real Google Play Store listing URL before launch
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.arabsyntax.app';

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
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={altText}
    >
      <Image
        src={badgeSrc}
        alt={altText}
        width={200}
        height={59}
        priority={false}
      />
    </a>
  );
}
