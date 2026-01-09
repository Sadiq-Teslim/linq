/**
 * Badge - Atomic UI component
 */
interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const variants = {
    default: "bg-white/10 text-slate-300 border border-white/10",
    success: "bg-green-500/20 text-green-300 border border-green-500/30",
    warning: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    error: "bg-red-500/20 text-red-300 border border-red-500/30",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
