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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-warning-border bg-brand-warning-soft p-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand-warning" />
        <div>
          <p className="text-[13px] font-bold text-brand-gray-900">Profil belum lengkap</p>
          <p className="mt-0.5 text-[11px] leading-snug text-brand-gray-700">
            Verifikasi nomor WhatsApp kamu supaya bisa memesan jasa dan dihubungi mitra.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onVerify}
        className="shrink-0 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-red-dark active:scale-95"
      >
        Verifikasi
      </button>
    </div>
  );
}
