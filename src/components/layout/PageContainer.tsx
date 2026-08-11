import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Lebar konten rute PELANGGAN per jenis halaman (audit B1/B2).
 *
 * Padanan `MitraPageContainer` untuk sisi pelanggan, yang sebelumnya tidak
 * punya kerangka apa pun: tiap halaman mengetik `max-w-*` sendiri, jadi lebar
 * konten melompat ratusan piksel saat berpindah antar halaman (mis. `/profile/wallet`
 * = `max-w-2xl` tapi `/profile/account` = `max-w-lg`).
 *
 * Gutter sengaja `px-4` datar . SAMA dengan default `MobilePageHeader`. Rute
 * pelanggan tidak punya sidebar (beda dari mode mitra), jadi tak perlu gutter
 * berjenjang; menyamakannya dengan header menjaga judul sejajar dengan kartu di
 * bawahnya tanpa mengubah headernya.
 */
export type PageContainerVariant = 'form' | 'content' | 'list' | 'wide';

const WIDTHS: Record<PageContainerVariant, string> = {
  form: 'max-w-2xl', // 672px . form fokus & halaman profil
  content: 'max-w-3xl', // 768px . keranjang, alur pesanan
  list: 'max-w-6xl', // 1152px . daftar layanan/kategori
  wide: 'max-w-[1200px]', // pencarian & halaman selebar app shell
};

/** Lebar mentah untuk komponen yang butuh kelasnya saja (mis. MobilePageHeader). */
export function pageWidthClass(variant: PageContainerVariant): string {
  return WIDTHS[variant];
}

interface PageContainerProps {
  variant?: PageContainerVariant;
  children: ReactNode;
  className?: string;
}

export default function PageContainer({
  variant = 'content',
  children,
  className = '',
}: PageContainerProps) {
  // `cn` (tailwind-merge): halaman yang butuh ritme lain mengoper `py-8`/`pb-24`
  // lewat className, dan merge memastikan kelas terakhir menang alih-alih dua
  // kelas padding ikut terpasang sekaligus.
  return (
    <div className={cn(WIDTHS[variant], 'mx-auto', 'px-4', 'py-6', className)}>
      {children}
    </div>
  );
}
