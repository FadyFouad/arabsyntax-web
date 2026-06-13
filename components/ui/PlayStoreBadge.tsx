import Image from 'next/image';

interface PlayStoreBadgeProps {
  locale: string;
  className?: string;
  /** Placement label for download attribution (e.g. "hero", "final_cta"). */
  source?: string;
}

export default function PlayStoreBadge({ locale, className, source }: PlayStoreBadgeProps) {
  const isArabic = locale === 'ar';
  const badgeSrc = isArabic
    ? '/badges/google-play-ar.png'
    : '/badges/google-play-en.png';
  const altText = isArabic
    ? 'متوفر على Google Play'
    : 'Get it on Google Play';

  return (
    // Routed through /go/android so the click is counted server-side before
    // redirecting to Google Play (see app/go/[platform]/route.ts).
    <a
      href={`/go/android?l=${locale}${source ? `&s=${source}` : ''}`}
      target="_blank"
      rel="noopener noreferrer nofollow"
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
