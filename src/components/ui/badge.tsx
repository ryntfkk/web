import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "discount"
    | "new"
    | "bestseller"
    | "verified"
    | "pro"
    | "info"
    | "success"
    | "warning"
    | "error"
    | "neutral";
}

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  discount: "bg-brand-red text-white",
  new: "bg-brand-blue text-white",
  bestseller: "bg-brand-orange text-white",
  verified: "bg-brand-success-soft text-brand-success-dark",
  pro: "bg-brand-purple text-white",
  info: "bg-brand-info-soft text-brand-info-dark",
  success: "bg-brand-success-soft text-brand-success-dark",
  warning: "bg-brand-warning-light text-brand-amber-dark",
  error: "bg-brand-error-soft text-brand-error-dark",
  neutral: "bg-brand-gray-60 text-brand-gray-700",
};

/** Badge/pill standar (diskon, status, label). Ukuran microcopy sesuai skala tipografi. */
export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-bold leading-none",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
