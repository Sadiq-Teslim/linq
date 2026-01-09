import React from "react";
import { cn } from "../lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = ({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = cn(
    "relative inline-flex items-center justify-center gap-2 font-medium",
    "rounded-xl transition-all duration-200 ease-out",
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-950",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  );

  const variants = {
    primary: cn(
      "bg-gradient-to-r from-blue-600 to-green-600 text-white",
      "hover:from-blue-500 hover:to-green-500",
      "focus:ring-blue-500",
      "shadow-md hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5",
    ),
    secondary: cn(
      "bg-white/5 text-white border border-white/10",
      "hover:bg-white/10",
      "focus:ring-white/20",
    ),
    outline: cn(
      "border border-white/20 text-white bg-transparent",
      "hover:bg-white/5 hover:border-white/30",
      "focus:ring-white/20",
    ),
    ghost: cn(
      "text-slate-400 bg-transparent",
      "hover:bg-white/5 hover:text-white",
      "focus:ring-white/20",
    ),
    danger: cn(
      "bg-gradient-to-r from-red-500 to-rose-500 text-white",
      "hover:from-red-400 hover:to-rose-400",
      "focus:ring-red-500",
      "shadow-md hover:shadow-lg",
    ),
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2.5",
    lg: "text-base px-6 py-3",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
