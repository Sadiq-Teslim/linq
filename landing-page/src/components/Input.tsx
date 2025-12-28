import React from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full px-4 py-2 border rounded-lg text-slate-900 placeholder-slate-400",
            "focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
            "disabled:bg-slate-50 disabled:cursor-not-allowed",
            error && "border-red-500 focus:border-red-500 focus:ring-red-200",
            !error && "border-slate-300",
            className
          )}
          {...props}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        {helperText && (
          <p className="text-slate-500 text-sm mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
