/**
 * Spinner - Loading indicator with brand colors
 */
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "default" | "gradient" | "simple";
}

export function Spinner({ 
  size = "md", 
  className,
  variant = "default"
}: SpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  if (variant === "gradient") {
    return (
      <div className={cn("relative", className)}>
        <div className={cn(
          sizes[size],
          "border-4 border-blue-500/20 border-t-blue-500 border-r-green-500 rounded-full animate-spin"
        )} />
      </div>
    );
  }

  if (variant === "simple") {
    return (
      <Loader2 className={cn(
        sizes[size],
        "animate-spin text-blue-500",
        className
      )} />
    );
  }

  // Default variant - using Loader2 icon with brand colors
  return (
    <Loader2 className={cn(
      sizes[size],
      "animate-spin text-blue-500",
      className
    )} />
  );
}
