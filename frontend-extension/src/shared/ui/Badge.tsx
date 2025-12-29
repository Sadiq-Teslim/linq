/**
 * Badge - Atomic UI component
 */
interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const variants = {
    default: "bg-muted text-foreground",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
