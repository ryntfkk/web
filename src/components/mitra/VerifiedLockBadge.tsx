'use client';

import { Lock, ShieldCheck } from 'lucide-react';

// F2 (MITRA-IMPLEMENTATION-PLAN): badge + notice untuk data verifikasi yang
// sudah diverifikasi admin. Dipakai di halaman mitra untuk:
// 1. Menandai field/dokumen yang sudah APPROVED (VerifiedLockBadge).
// 2. Menjelaskan kenapa form/tombol dikunci (VerifiedLockNotice).

export function VerifiedLockBadge({ label = 'Terverifikasi' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-success-soft px-2 py-0.5 text-xs font-semibold text-brand-success">
      <ShieldCheck className="h-3 w-3" />
      {label}
    </span>
  );
}

export function VerifiedLockNotice({
  title = 'Data terkunci',
  message = 'Data ini sudah diverifikasi admin. Hubungi admin untuk mengubah (cabut verifikasi).',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-brand-gray-200 bg-brand-gray-50 p-3 text-sm text-brand-gray-700">
      <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-gray-450" />
      <div>
        <p className="font-semibold text-brand-gray-800">{title}</p>
        <p className="mt-0.5 text-xs text-brand-gray-600">{message}</p>
      </div>
    </div>
  );
}
