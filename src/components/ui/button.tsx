import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", type = "button", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-bold text-[14px] leading-none
      rounded-md border border-transparent
      transition-all duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b51822] focus-visible:ring-offset-2
      disabled:opacity-40 disabled:cursor-not-allowed
      active:scale-[0.98]
    `;

    const variants = {
      primary: `
        bg-[#b51822] text-white
        hover:bg-[#90121a]
        border-transparent
      `,
      secondary: `
        bg-transparent text-[#b51822]
        border-[#b51822]
        hover:bg-[#f0eded]
      `,
      outline: `
        bg-transparent text-[#5b403e]
        border-[#e5e2e1]
        hover:bg-[#f7f5f4] hover:border-[#b51822]/50
      `,
      ghost: `
        bg-transparent text-[#b51822]
        border-transparent
        hover:bg-[#f0eded]
      `,
      danger: `
        bg-[#E53E3E] text-white
        hover:bg-[#c53030]
        border-transparent
      `,
      link: `
        bg-transparent text-[#b51822]
        border-transparent
        hover:underline
        p-0 h-auto
      `,
    };

    const sizes = {
      default: "h-[44px] min-h-[44px] px-4 py-3",
      sm: "h-[36px] min-h-[36px] px-3 py-2 text-[12px]",
      lg: "h-[48px] min-h-[48px] px-6 py-3",
      icon: "h-[44px] w-[44px] p-0",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };