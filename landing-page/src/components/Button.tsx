import React from "react";
import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none";

    const variants = {
      primary:
        "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400",
      secondary:
        "bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-50",
      outline:
        "border border-slate-300 text-slate-900 hover:bg-slate-50 disabled:opacity-50",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    return (
      <button
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          loading && "opacity-75 cursor-not-allowed",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <span className="animate-spin mr-2">⟳</span> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
