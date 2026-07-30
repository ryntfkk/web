import * as React from "react";
import { cn } from "@/lib/utils";

interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
  /** Tampil juga di desktop (default: mobile-only, mengikuti pola BottomNav). */
  desktop?: boolean;
}

/**
 * Bar aksi sticky di bawah layar (CTA utama: checkout, pesan, bayar).
 * Default mobile-only (`lg:hidden`); desktop memakai sidebar/summary sticky.
 * Sudah termasuk safe-area iOS via `pb-safe`.
 */
export function StickyActionBar({ children, className, desktop = false }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-20 border-t border-brand-gray-100 bg-white px-4 pt-3 pb-safe shadow-top",
        !desktop && "lg:hidden",
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1200px] items-center gap-3">{children}</div>
    </div>
  );
}
