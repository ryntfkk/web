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
}: MobilePageHeaderProps) {
  const router = useRouter();
  const backClass = 'p-2 -ml-2 hover:bg-[#f7f5f4] rounded';
  const arrow = <ArrowLeft className="w-5 h-5 text-[#5b403e]" />;

  return (
    <div className={`bg-white border-b border-[#e5e2e1] sticky top-0 z-10 ${alwaysShow ? '' : 'lg:hidden'}`}>
      <div className={`${maxWidthClass} mx-auto flex items-center px-4 py-4 gap-3`}>
        {backHref ? (
          <Link href={backHref} className={backClass}>
            {arrow}
          </Link>
        ) : (
          <button onClick={onBack ?? (() => router.back())} className={backClass}>
            {arrow}
          </button>
        )}
        {icon}
        {subtitle ? (
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#1c1b1b] flex items-center gap-2 leading-tight">{title}</h1>
            <p className="text-xs text-[#9e8e8c] leading-tight truncate">{subtitle}</p>
          </div>
        ) : (
          <h1 className="text-base font-bold text-[#1c1b1b] flex items-center gap-2">{title}</h1>
        )}
        {right && <div className="ml-auto">{right}</div>}
      </div>
    </div>
  );
}
