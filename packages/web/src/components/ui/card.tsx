import React from "react";

type CardVariant = "default" | "hero";

const variantClasses: Record<CardVariant, string> = {
  default: "rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
  hero: "rounded-xl border border-gray-200 bg-gradient-to-br from-brand-50 to-brand-100 p-6 shadow-sm",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({
  variant = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
