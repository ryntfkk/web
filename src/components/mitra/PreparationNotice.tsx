'use client';

import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';

/**
 * Ditampilkan di halaman "prepare" (layanan, portofolio, jadwal) untuk mitra
 * yang belum disetujui (P1-10).
 *
 * Tanpa ini, mitra menyiapkan etalasenya lalu bingung kenapa tidak ada yang
 * memesan — layanannya memang belum tampil publik. Menjelaskannya di tempat ia
 * bekerja lebih jujur daripada membiarkannya menebak.
 */
export default function PreparationNotice({ status }: { status: 'PENDING' | 'REJECTED' }) {
  const rejected = status === 'REJECTED';
  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <div
        className={`flex items-start gap-2.5 rounded-xl border p-3 ${
          rejected
            ? 'border-brand-error-border bg-brand-error-soft'
            : 'border-brand-warning-border bg-brand-warning-soft'
        }`}
      >
        <ClipboardCheck
          className={`mt-0.5 h-4 w-4 shrink-0 ${rejected ? 'text-brand-red' : 'text-brand-warning-dark'}`}
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-gray-900">
            {rejected ? 'Verifikasi ditolak' : 'Menunggu verifikasi'}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-brand-gray-700">
            Kamu tetap bisa menyiapkan semuanya dari sini. Yang kamu simpan{' '}
            <strong>baru tampil ke pelanggan setelah akunmu disetujui</strong>.
          </p>
          <Link
            href="/mitra/verification-status"
            className="mt-1.5 inline-block text-xs font-semibold text-brand-red hover:underline"
          >
            {rejected ? 'Lihat alasan & ajukan ulang' : 'Lihat status verifikasi'}
          </Link>
        </div>
      </div>
    </div>
  );
}
