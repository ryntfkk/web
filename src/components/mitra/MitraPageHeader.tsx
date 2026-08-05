'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { containerWidthClass, MITRA_GUTTER, type MitraContainerVariant } from './MitraPageContainer';

export interface MitraBreadcrumb {
  label: string;
  href?: string;
}

interface MitraPageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
  right?: ReactNode;
  /** Menentukan lebar bilah header agar sejajar dengan konten di bawahnya. */
  variant?: MitraContainerVariant;
  /**
   * Remah roti . hanya dirender mulai `lg`. Di mobile tombol back sudah menjadi
   * satu-satunya jalur "ke atas", dan remah roti di layar sempit hanya memakan
   * baris tanpa menambah informasi.
   */
  breadcrumbs?: MitraBreadcrumb[];
}

/**
 * Header standar halaman mode mitra (§6.4).
 *
 * Membungkus `MobilePageHeader` dengan `alwaysShow` karena area mitra TIDAK
 * punya TopNavbar di breakpoint mana pun . tanpa `alwaysShow` halaman mitra di
 * desktop kehilangan judul dan tombol kembali sekaligus.
 */
export default function MitraPageHeader({
  title,
  subtitle,
  backHref,
  onBack,
  right,
  variant = 'list',
  breadcrumbs,
}: MitraPageHeaderProps) {
  const width = containerWidthClass(variant);

  return (
    <div className="sticky top-0 z-10">
      <MobilePageHeader
        alwaysShow
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        onBack={onBack}
        right={right}
        maxWidthClass={width}
        gutterClass={MITRA_GUTTER}
      />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Remah roti"
          className="hidden border-b border-brand-gray-100 bg-white lg:block"
        >
          <ol className={`${width} mx-auto flex items-center gap-1 ${MITRA_GUTTER} py-2 text-xs text-brand-gray-450`}>
            {breadcrumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-brand-gray-100" aria-hidden />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-brand-red">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-brand-gray-700">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}
