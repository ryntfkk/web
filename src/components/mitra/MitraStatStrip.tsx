import type { ReactNode } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Satu baris metrik bersekat untuk mode mitra.
 *
 * Menggantikan grid kartu metrik yang di mobile memakan dua baris penuh (mis.
 * dashboard: Saldo/Pendapatan/Pesanan/Rating sebagai 2×2). Sebagai satu baris
 * bersekat, tingginya ≈ satu kartu . dan konten produktif (daftar pesanan,
 * pintasan) naik ke atas layar.
 *
 * Item ber-`href` dirender sebagai `<Link>` (elemen bisa difokus & merespons
 * Enter . bukan `<div onClick>`). `value`/`sub` menerima ReactNode agar bisa
 * menyisipkan ikon (mis. bintang rating) tanpa prop tambahan.
 */
export interface MitraStat {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  href?: string;
  /** Kelas warna nilai, mis. `text-brand-success` untuk pendapatan. */
  valueClassName?: string;
}

interface MitraStatStripProps {
  items: MitraStat[];
  className?: string;
}

export default function MitraStatStrip({ items, className = '' }: MitraStatStripProps) {
  return (
    <div
      className={cn(
        'flex items-stretch divide-x divide-brand-gray-100 overflow-hidden rounded-lg border border-brand-gray-100 bg-white',
        className,
      )}
    >
      {items.map((item) => {
        const inner = (
          <>
            <p className="truncate text-[11px] text-brand-gray-700">{item.label}</p>
            <p className={cn('text-sm font-bold text-brand-gray-900', item.valueClassName)}>{item.value}</p>
            {item.sub != null && <p className="truncate text-[11px] text-brand-gray-450">{item.sub}</p>}
          </>
        );

        return item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className="min-w-0 flex-1 px-3 py-2 text-center transition-colors hover:bg-brand-gray-60"
          >
            {inner}
          </Link>
        ) : (
          <div key={item.label} className="min-w-0 flex-1 px-3 py-2 text-center">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
