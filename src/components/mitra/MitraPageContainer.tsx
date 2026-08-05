import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Lebar konten mode mitra per jenis halaman (§5.3).
 *
 * Ada supaya lebarnya berhenti diketik ulang di tiap halaman. Sebelum ini
 * setiap halaman memilih `max-w-*` sendiri, dan hasilnya form fokus, daftar,
 * dan dashboard punya lebar yang tidak berhubungan satu sama lain . di layar
 * lebar ketiganya terlihat seperti tiga aplikasi berbeda.
 *
 * Ruang desktop dipakai untuk KOLOM dan whitespace, bukan untuk membesarkan
 * kartu. Karena itu tidak ada varian yang melebihi `max-w-7xl`.
 */
export type MitraContainerVariant = 'form' | 'list' | 'dashboard' | 'detail' | 'profile';

/**
 * Jarak ke tepi area konten mitra . SATU-SATUNYA sumber; jangan ketik `px-*`
 * sendiri di halaman.
 *
 * Kenapa harus berjenjang: sidebar `w-60` memakan 240px, jadi di laptop 1366px
 * ruang konten tinggal 1126px . lebih sempit dari `max-w-6xl` (1152px). Capnya
 * tidak pernah aktif di sana, sehingga `px-4` datar adalah satu-satunya jarak ke
 * tepi yang tersisa dan konten menempel ke pinggir layar.
 *
 * Header WAJIB memakai gutter yang sama (lihat `MitraPageHeader`). Kalau
 * kontainer `lg:px-8` sementara header tetap `px-4`, judulnya bergeser 16px dari
 * kartu di bawahnya.
 */
export const MITRA_GUTTER = 'px-4 sm:px-6 lg:px-8';

const WIDTHS: Record<MitraContainerVariant, string> = {
  form: 'max-w-2xl',
  list: 'max-w-6xl',
  dashboard: 'max-w-7xl',
  detail: 'max-w-6xl',
  profile: 'max-w-5xl',
};

/** Lebar mentah untuk komponen yang butuh kelasnya saja (mis. MitraPageHeader). */
export function containerWidthClass(variant: MitraContainerVariant): string {
  return WIDTHS[variant];
}

interface MitraPageContainerProps {
  variant?: MitraContainerVariant;
  children: ReactNode;
  className?: string;
}

export default function MitraPageContainer({
  variant = 'list',
  children,
  className = '',
}: MitraPageContainerProps) {
  // `cn` (tailwind-merge), bukan template string: halaman yang butuh ritme lain
  // mengoper `py-8`/`pb-32` lewat className, dan tanpa merge kedua kelas ikut
  // terpasang lalu urutan CSS-lah yang menentukan pemenangnya . bukan pemanggil.
  return (
    <div className={cn(WIDTHS[variant], 'mx-auto', MITRA_GUTTER, 'py-6', className)}>
      {children}
    </div>
  );
}
