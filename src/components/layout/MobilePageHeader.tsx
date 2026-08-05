"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface MobilePageHeaderProps {
  title: string;
  /** Baris kedua kecil di bawah judul (mis. "Maksimal 5 foto"). */
  subtitle?: string;
  icon?: ReactNode;
  /** Jika diisi, tombol back jadi Link (aman untuk deep-link tanpa history). */
  backHref?: string;
  /** Default: router.back(). */
  onBack?: () => void;
  /** Aksi opsional di sisi kanan header (mis. "Tandai semua dibaca"). */
  right?: ReactNode;
  /**
   * Tampilkan di semua ukuran layar. Default: hanya mobile (lg:hidden), karena
   * di desktop TopNavbar jadi satu-satunya header. Area mitra TIDAK punya
   * TopNavbar di breakpoint mana pun (lihat HeaderWrapper), jadi halaman mitra
   * memakai alwaysShow agar header + tombol back tetap ada di desktop.
   */
  alwaysShow?: boolean;
  /** Lebar maksimum kontainer dalam (sesuaikan dgn lebar konten halaman). Default max-w-lg. */
  maxWidthClass?: string;
  /**
   * Tag judul header. Default 'h1' karena di sebagian besar halaman inilah satu-
   * satunya judul. Halaman yang punya H1 sendiri di badan konten (mis. landing
   * SEO /kategori & /jasa) WAJIB set 'p' . kalau tidak, HTML berisi dua H1 dan
   * Google mendapat dua judul yang bersaing pada satu halaman.
   */
  titleAs?: 'h1' | 'p';
}

// Header untuk halaman drill-down. Default lg:hidden (mobile saja); pakai
// alwaysShow untuk area tanpa TopNavbar desktop (mode mitra).
export default function MobilePageHeader({
  title,
  subtitle,
  icon,
  backHref,
  onBack,
  right,
  alwaysShow = false,
  maxWidthClass = 'max-w-lg',
  titleAs = 'h1',
}: MobilePageHeaderProps) {
  const router = useRouter();
  const backClass = 'p-2 -ml-2 hover:bg-brand-gray-60 rounded';
  const arrow = <ArrowLeft className="w-5 h-5 text-brand-gray-700" />;
  const Title = titleAs;

  return (
    <div className={`bg-white border-b border-brand-gray-100 sticky top-0 z-10 ${alwaysShow ? '' : 'lg:hidden'}`}>
      <div className={`${maxWidthClass} mx-auto flex items-center px-4 py-4 gap-3`}>
        {backHref ? (
          <Link href={backHref} className={backClass} aria-label="Kembali">
            {arrow}
          </Link>
        ) : (
          <button onClick={onBack ?? (() => router.back())} className={backClass} aria-label="Kembali">
            {arrow}
          </button>
        )}
        {icon}
        {subtitle ? (
          <div className="min-w-0">
            <Title className="text-base font-bold text-brand-gray-900 flex items-center gap-2 leading-tight">{title}</Title>
            <p className="text-xs text-brand-gray-450 leading-tight truncate">{subtitle}</p>
          </div>
        ) : (
          <Title className="text-base font-bold text-brand-gray-900 flex items-center gap-2 truncate">{title}</Title>
        )}
        {right && <div className="ml-auto">{right}</div>}
      </div>
    </div>
  );
}
