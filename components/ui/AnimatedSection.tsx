interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
}

// Pure-CSS reveal: the content renders visible by default and the entrance
// animation runs via CSS (no JS gating), so a section can never get stuck
// invisible if hydration is slow or fails. `prefers-reduced-motion` is
// respected in globals.css.
export default function AnimatedSection({ children, className }: AnimatedSectionProps) {
  return (
    <div className={['reveal-in', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
