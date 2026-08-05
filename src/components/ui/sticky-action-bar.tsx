import * as React from "react";
import { cn } from "@/lib/utils";

interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
  /** Tampil juga di desktop (default: mobile-only, mengikuti pola BottomNav). */
  desktop?: boolean;
  /**
   * Lebar isi bilah. Default `max-w-[1200px]` = lebar aplikasi pelanggan. Mode
   * mitra WAJIB mengoper lebar variannya sendiri . kalau tidak tombolnya
   * terpusat pada lebar yang tak berhubungan dengan form di atasnya dan
   * terlihat bergeser.
   */
  contentClassName?: string;
}

/**
 * Bar aksi sticky di bawah layar (CTA utama: checkout, pesan, bayar).
 * Default mobile-only (`lg:hidden`); desktop memakai sidebar/summary sticky.
 * Sudah termasuk safe-area iOS via `pb-safe`.
 *
 * `z-40` = tangga z-index mode mitra: di atas sidebar (z-30), di bawah bottom
 * nav (z-50). Sebelumnya bilah aksi dan bottom nav sama-sama `z-50` dan yang
 * menang ditentukan urutan DOM.
 */
export function StickyActionBar({
  children,
  className,
  desktop = false,
  contentClassName,
}: StickyActionBarProps) {
  return (
    <div
      className={cn(
        // `px-4` sengaja tetap di pembungkus luar: /payment mematikannya lewat
        // `className="px-0"` dan menaruh paddingnya sendiri di dalam.
        //
        // Padding bawah = 0.75rem DITAMBAH safe-area, bukan `pb-safe` saja.
        // `env(safe-area-inset-bottom)` bernilai 0 di desktop dan di Android,
        // jadi `pb-safe` sendirian membuat tombol menempel ke tepi bawah layar
        // di sebagian besar perangkat.
        "fixed bottom-0 left-0 right-0 z-40 border-t border-brand-gray-100 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-top",
        !desktop && "lg:hidden",
        className,
      )}
    >
      <div className={cn("mx-auto flex items-center gap-3 max-w-[1200px]", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
