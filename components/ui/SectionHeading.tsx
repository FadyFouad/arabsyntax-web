interface SectionHeadingProps {
  heading: string;
  subtitle?: string;
  className?: string;
}

export default function SectionHeading({ heading, subtitle, className }: SectionHeadingProps) {
  return (
    <div className={className}>
      <h2 className="text-4xl font-bold text-text">{heading}</h2>
      {subtitle && (
        <p className="mt-4 text-text-muted text-lg">{subtitle}</p>
      )}
    </div>
  );
}
