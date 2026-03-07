import React from "react";

type CardVariant = "default" | "hero";

const variantClasses: Record<CardVariant, string> = {
  default: "rounded-xl border border-warm-200 bg-white p-6 shadow-sm",
  hero: "rounded-xl border border-warm-200 bg-warm-100 p-6 shadow-sm",
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
