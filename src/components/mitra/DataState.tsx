'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Keadaan satu wilayah data: memuat / gagal / kosong / ada isi (§6.4).
 *
 * Alasannya bukan kerapian. Sebelum ini tiap halaman menuliskan sendiri
 * cabang-cabangnya, dan yang paling sering hilang justru **gagal-memuat** .
 * halaman langsung jatuh ke "belum ada data", sehingga mitra mengira
 * pesanan/mutasi/layanannya hilang padahal request-nya yang gagal (P1-11).
 *
 * Urutan cabangnya disengaja: `loading` → `error` → `empty` → isi. Menaruh
 * `empty` sebelum `error` adalah cara paling gampang menghadirkan kembali bug
 * yang sama, karena daftar kosong DAN gagal sama-sama berarti "tidak ada baris".
 */
interface DataStateProps {
  isLoading: boolean;
  /** Pesan error. Null/undefined = tidak ada error. */
  error?: string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  /** Kerangka saat memuat. Bila kosong, dipakai kerangka bawaan. */
  skeleton?: ReactNode;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Aksi pada keadaan kosong, mis. "Tambah Layanan". */
  emptyAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function DataState({
  isLoading,
  error,
  isEmpty = false,
  onRetry,
  skeleton,
  emptyIcon,
  emptyTitle = 'Belum ada data',
  emptyDescription,
  emptyAction,
  children,
  className = '',
}: DataStateProps) {
  if (isLoading) {
    return (
      <div className={className}>
        {skeleton ?? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border border-brand-gray-100 bg-white" />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className={`rounded-lg border border-brand-gray-100 bg-white py-10 text-center ${className}`}
      >
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-brand-warning" />
        <p className="mb-1 text-sm font-semibold text-brand-gray-900">Gagal memuat data</p>
        <p className="mx-auto mb-4 max-w-xs px-4 text-xs text-brand-gray-450">{error}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Coba Lagi
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={`rounded-lg border border-brand-gray-100 bg-white py-10 text-center ${className}`}>
        {emptyIcon}
        <p className="mb-1 text-sm text-brand-gray-700">{emptyTitle}</p>
        {emptyDescription && (
          <p className="mx-auto mb-4 max-w-xs px-4 text-xs text-brand-gray-450">{emptyDescription}</p>
        )}
        {emptyAction}
      </div>
    );
  }

  return <>{children}</>;
}
