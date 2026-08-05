'use client';

import { ShieldAlert } from 'lucide-react';

interface ProfileCompletionBannerProps {
  onVerify: () => void;
}

/**
 * Pengingat persisten untuk akun yang belum punya nomor terverifikasi .
 * terutama akun Google, yang lahir tanpa nomor sama sekali.
 *
 * Ada karena interstitial /lengkapi-profil bisa dilewati ("Nanti saja"); tanpa
 * pengingat ini, syaratnya baru muncul lagi saat pemesanan ditolak server.
 */
export default function ProfileCompletionBanner({ onVerify }: ProfileCompletionBannerProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-brand-gray-900">Profil belum lengkap</p>
        <p className="text-xs text-brand-gray-700 mt-0.5">
          Verifikasi nomor WhatsApp kamu supaya bisa memesan jasa dan dihubungi mitra.
        </p>
        <button
          type="button"
          onClick={onVerify}
          className="mt-2 text-xs font-bold text-brand-red hover:underline"
        >
          Verifikasi Sekarang
        </button>
      </div>
    </div>
  );
}
