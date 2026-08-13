'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { track } from '@/lib/analytics';

/**
 * Pulau klien di halaman yang selebihnya dirender di server.
 *
 * Halaman /jadi-mitra sengaja Server Component supaya seluruh teksnya masuk
 * HTML pertama . itu inti janji halaman ini. Hanya dua hal yang butuh JS:
 * mencatat kunjungan dan mencatat klik CTA. Keduanya dipisah ke sini agar sisa
 * halaman tetap nol JS.
 */

/** Mencatat satu kunjungan, sekali per pemuatan halaman. */
export function TrackLandingView() {
  const sudahDicatat = useRef(false);

  useEffect(() => {
    // React 18 StrictMode menjalankan effect dua kali di dev. Tanpa penjaga ini
    // angka kunjungan di dev berlipat dua dan menyesatkan saat membandingkan
    // funnel dengan produksi.
    if (sudahDicatat.current) return;
    sudahDicatat.current = true;
    track('partner_landing_viewed');
  }, []);

  return null;
}

interface CtaDaftarProps {
  /** Bagian halaman tempat tombol ini berada . dipakai membandingkan CTA mana yang bekerja. */
  position: string;
  label?: string;
  variant?: 'primary' | 'outline';
  className?: string;
}

/**
 * Tombol daftar. Mengarah ke /jadi-mitra/daftar . formulir satu-atap (akun +
 * KYC + kategori + layanan pertama), menggantikan arah lama ke /mitra/register
 * yang mengharuskan calon mitra melewati 7 langkah dan dua verifikasi kontak
 * sebelum bisa menyiapkan etalase. /mitra/register tetap hidup untuk jalur
 * dalam aplikasi (pengguna yang sudah login).
 *
 * Pengunjung anonim tidak buntu: halaman daftar membuat akun lewat
 * /auth/register/quick tanpa OTP, dan pengguna yang sudah login langsung
 * melewati bagian akun.
 */
export function CtaDaftar({
  position,
  label = 'Daftar Jadi Mitra. Gratis',
  variant = 'primary',
  className = '',
}: CtaDaftarProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red';
  const skin =
    variant === 'primary'
      ? 'bg-brand-red text-white hover:bg-brand-red-dark'
      : 'border border-brand-gray-100 bg-white text-brand-gray-900 hover:border-brand-red hover:text-brand-red';

  return (
    <Link
      href="/jadi-mitra/daftar"
      onClick={() => track('partner_landing_cta_clicked', { position })}
      className={`${base} ${skin} ${className}`}
    >
      {label}
      <ArrowRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}
