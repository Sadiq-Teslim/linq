import React from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export const Button = ({ className, variant = 'primary', isLoading, children, ...props }: ButtonProps) => {
  const baseStyles = "w-full py-2 px-4 rounded-md font-medium transition-all text-sm flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-500 hover:text-slate-900"
  };

  return (
    <button className={cn(baseStyles, variants[variant], className)} disabled={isLoading} {...props}>
      {isLoading ? <span className="animate-spin">⏳</span> : children}
    </button>
  );
};