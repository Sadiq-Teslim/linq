/**
 * Card - Atomic UI component
 */
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`p-4 border border-border rounded-lg bg-background ${className}`}>
      {children}
    </div>
  );
}
