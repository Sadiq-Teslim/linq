import React from 'react';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = cn(
    'relative inline-flex items-center justify-center gap-2 font-medium',
    'rounded-xl transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
  );

  const variants = {
    primary: cn(
      'bg-gradient-to-r from-indigo-600 to-purple-600 text-white',
      'hover:from-indigo-700 hover:to-purple-700',
      'focus:ring-indigo-500',
      'shadow-md hover:shadow-lg hover:-translate-y-0.5'
    ),
    secondary: cn(
      'bg-slate-900 text-white',
      'hover:bg-slate-800',
      'focus:ring-slate-500',
      'shadow-md hover:shadow-lg'
    ),
    outline: cn(
      'border-2 border-slate-200 text-slate-700 bg-white',
      'hover:border-slate-300 hover:bg-slate-50',
      'focus:ring-slate-300'
    ),
    ghost: cn(
      'text-slate-600 bg-transparent',
      'hover:bg-slate-100 hover:text-slate-900',
      'focus:ring-slate-300'
    ),
    danger: cn(
      'bg-gradient-to-r from-red-500 to-rose-500 text-white',
      'hover:from-red-600 hover:to-rose-600',
      'focus:ring-red-500',
      'shadow-md hover:shadow-lg'
    ),
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-6 py-3',
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