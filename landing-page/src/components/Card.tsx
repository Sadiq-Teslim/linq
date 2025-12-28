import { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className }: CardProps) => (
  <div
    className={clsx(
      "bg-white border border-slate-200 rounded-lg shadow-sm",
      className
    )}
  >
    {children}
  </div>
);
