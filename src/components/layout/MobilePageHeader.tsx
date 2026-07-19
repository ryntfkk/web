"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface MobilePageHeaderProps {
  title: string;
  icon?: ReactNode;
  /** Jika diisi, tombol back jadi Link (aman untuk deep-link tanpa history). */
  backHref?: string;
  /** Default: router.back(). */
  onBack?: () => void;
  /** Aksi opsional di sisi kanan header (mis. "Tandai semua dibaca"). */
  right?: ReactNode;
}

// Header khusus mobile untuk halaman drill-down — di desktop TopNavbar
// sudah jadi satu-satunya header, jadi komponen ini lg:hidden.
export default function MobilePageHeader({ title, icon, backHref, onBack, right }: MobilePageHeaderProps) {
  const router = useRouter();
  const backClass = 'p-2 -ml-2 hover:bg-[#f7f5f4] rounded';
  const arrow = <ArrowLeft className="w-5 h-5 text-[#5b403e]" />;

  return (
    <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10 lg:hidden">
      <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
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
        <h1 className="text-base font-bold text-[#1c1b1b] flex items-center gap-2">{title}</h1>
        {right && <div className="ml-auto">{right}</div>}
      </div>
    </div>
  );
}
