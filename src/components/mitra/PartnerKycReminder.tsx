'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, X } from 'lucide-react';

import { usePartnerVerificationStatus } from '@/hooks/usePartnerVerificationStatus';

const DISMISS_KEY = 'mitra_kyc_reminder_dismissed';

/**
 * Pengingat verifikasi (KYC) di Dashboard mitra.
 *
 * Konteks: spanduk `PreparationNotice` sengaja DIHILANGKAN dari halaman kelola
 * layanan/portofolio/jadwal (permintaan pemilik . form tidak boleh diselingi
 * ajakan verifikasi). Di desktop pengingat masih ada di sidebar, tapi di MOBILE
 * sidebar tidak tampil . jadi kartu ini menutup celah itu: satu pengingat
 * proaktif di "home" mode mitra, terlihat di mobile & desktop, tanpa mengganggu
 * alur tugas.
 *
 * MODEL MITRA INSTAN: layanan sudah tayang & bisa dipesan tanpa KYC. Yang
 * digerbangi KYC hanya badge Terverifikasi + tarik dana . jadi teksnya soal itu,
 * BUKAN "baru tampil setelah disetujui".
 *
 * PENDING boleh ditutup (localStorage, permanen) . gerbang keras di halaman
 * Tarik Dana tetap menangkap mitra saat benar-benar butuh. REJECTED tidak bisa
 * ditutup: lebih mendesak, mitra perlu melihat alasan & mengajukan ulang.
 */
export default function PartnerKycReminder() {
  const { data: verification } = usePartnerVerificationStatus();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Penanda hidrasi + bacaan localStorage: keduanya klien-saja, jadi setState di
  // effect memang disengaja (pola sama dengan MitraLayoutClient).
  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      /* akses storage bisa gagal (mode privat) . anggap belum ditutup */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const rejected = verification === 'REJECTED';
  // Tampil hanya untuk mitra yang belum lolos KYC. APPROVED / NONE / status
  // belum diketahui → diam. mounted menjaga agar SSR & klien konsisten
  // (bacaan localStorage cuma ada di klien).
  const show =
    mounted &&
    !!verification &&
    verification !== 'APPROVED' &&
    verification !== 'NONE' &&
    (rejected || !dismissed);

  if (!show) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* noop */
    }
  };

  return (
    <div
      className={`relative flex items-start gap-2.5 rounded-lg border p-3 ${
        rejected
          ? 'border-brand-error-border bg-brand-error-soft'
          : 'border-brand-warning-border bg-brand-warning-soft'
      }`}
    >
      <ShieldCheck
        className={`mt-0.5 h-4 w-4 shrink-0 ${rejected ? 'text-brand-red' : 'text-brand-warning-dark'}`}
      />
      <div className={`min-w-0 ${rejected ? '' : 'pr-6'}`}>
        <p className="text-xs font-semibold text-brand-gray-900">
          {rejected ? 'Verifikasi ditolak' : 'Belum terverifikasi'}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-brand-gray-700">
          Layananmu <strong>sudah tayang dan bisa dipesan</strong>. Lengkapi verifikasi identitas
          (KYC) untuk badge Terverifikasi di profilmu dan agar bisa menarik dana.
        </p>
        <Link
          href={rejected ? '/mitra/verification-status' : '/mitra/kyc'}
          className="mt-1.5 inline-block text-xs font-semibold text-brand-red hover:underline"
        >
          {rejected ? 'Lihat alasan & ajukan ulang' : 'Verifikasi sekarang'}
        </Link>
      </div>
      {!rejected && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup pengingat"
          className="absolute right-2 top-2 rounded-full p-1 text-brand-gray-450 transition-colors hover:bg-black/5 hover:text-brand-gray-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
