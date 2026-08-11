import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", type = "button", isLoading, children, disabled, ...props }, ref) => {
    // `relative` dipakai state loading: spinner diposisikan absolut di tengah
    // sementara isi aslinya tetap ada (invisible) supaya lebar tombol TIDAK
    // berubah saat memuat.
    const baseStyles = `
      relative
      inline-flex items-center justify-center
      font-bold text-[14px] leading-none
      rounded-md border border-transparent
      transition-all duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2
      disabled:opacity-40 disabled:cursor-not-allowed
      active:scale-[0.98]
    `;

    const variants = {
      primary: `
        bg-brand-red text-white
        hover:bg-brand-red-dark
        border-transparent
      `,
      secondary: `
        bg-transparent text-brand-red
        border-brand-red
        hover:bg-brand-red-light
      `,
      outline: `
        bg-transparent text-brand-gray-700
        border-brand-gray-100
        hover:bg-brand-gray-60 hover:border-brand-red/50
      `,
      ghost: `
        bg-transparent text-brand-red
        border-transparent
        hover:bg-brand-red-light
      `,
      danger: `
        bg-brand-error text-white
        hover:bg-brand-error-dark
        border-transparent
      `,
      link: `
        bg-transparent text-brand-red
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
          /*
           * Spinner MENIMPA isi, bukan menggantikannya.
           *
           * Versi lama mengganti seluruh children dengan spinner + teks
           * "Loading..." . dua masalah sekaligus: (1) pada tombol ikon persegi
           * (`h-11 w-11 p-0`, mis. tombol Chat di halaman layanan) teksnya
           * meluber keluar kotak, dan (2) "Loading..." adalah satu-satunya
           * kata Inggris di UI yang sepenuhnya berbahasa Indonesia (audit D3/C8).
           *
           * Dengan isi asli dipertahankan tapi `invisible`, lebar tombol tidak
           * berubah saat memuat . jadi tidak ada pula pergeseran tata letak.
           */
          <>
            <span className="absolute inset-0 flex items-center justify-center">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Memuat"
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
            </span>
            <span className="invisible inline-flex items-center">{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };