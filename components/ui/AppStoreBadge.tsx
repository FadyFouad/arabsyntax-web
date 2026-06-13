import Image from 'next/image';

interface AppStoreBadgeProps {
  locale: string;
  className?: string;
  /** Placement label for download attribution (e.g. "hero", "final_cta"). */
  source?: string;
}

export default function AppStoreBadge({ locale, className, source }: AppStoreBadgeProps) {
  const isArabic = locale === 'ar';
  const badgeSrc = isArabic
    ? '/badges/app-store-ar.svg'
    : '/badges/app-store-en.svg';
  const altText = isArabic
    ? 'حمّل من App Store'
    : 'Download on the App Store';

  return (
    // Routed through /go/ios so the click is counted server-side before
    // redirecting to the App Store (see app/go/[platform]/route.ts).
    <a
      href={`/go/ios?l=${locale}${source ? `&s=${source}` : ''}`}
      target="_blank"
      rel="noopener noreferrer nofollow"
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
