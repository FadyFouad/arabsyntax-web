interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 lg:p-8 ${className ?? ''}`}>
      {children}
    </div>
  );
}
