import type { ReactNode } from 'react';

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
  return <div className={`${WIDTHS[variant]} mx-auto px-4 ${className}`}>{children}</div>;
}
