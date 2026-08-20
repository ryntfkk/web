'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { track } from '@/lib/analytics';

/**
 * Pulau klien halaman /build.
 *
 * Halaman /build dan /build/[role] sengaja Server Component penuh . seluruh
 * teksnya harus ada di HTML pertama, karena pembacanya datang dari tautan yang
 * dibagikan (WhatsApp, LinkedIn, email) dan sebagian merender pratinjau tanpa
 * menjalankan JS. Yang benar-benar butuh JS hanya pencatatan kunjungan dan
 * klik CTA, jadi keduanya dipisah ke berkas ini.
 */

/** Mencatat satu kunjungan halaman /build, sekali per pemuatan. */
export function TrackBuildView() {
  const sudahDicatat = useRef(false);

  useEffect(() => {
    // StrictMode menjalankan effect dua kali di dev. Tanpa penjaga ini angka
    // kunjungan di dev berlipat dua dan menyesatkan saat funnel dibandingkan
    // dengan produksi.
    if (sudahDicatat.current) return;
    sudahDicatat.current = true;
    track('build_page_viewed');
  }, []);

  return null;
}

/** Mencatat kunjungan satu halaman detail peran. */
export function TrackRoleView({ role }: { role: string }) {
  const sudahDicatat = useRef(false);

  useEffect(() => {
    if (sudahDicatat.current) return;
    sudahDicatat.current = true;
    track('build_role_viewed', { role });
  }, [role]);

  return null;
}

type Variant = 'primary' | 'dark' | 'outline' | 'ghost';

const SKIN: Record<Variant, string> = {
  primary: 'bg-brand-red text-white hover:bg-brand-red-dark',
  dark: 'bg-brand-gray-900 text-white hover:bg-brand-gray-800',
  outline:
    'border border-brand-gray-200 bg-white text-brand-gray-900 hover:border-brand-gray-900',
  ghost: 'bg-white text-brand-gray-900 hover:bg-brand-gray-60',
};

interface BuildCtaProps {
  href: string;
  /** Bagian halaman tempat tombol ini berada . dipakai membandingkan CTA mana yang bekerja. */
  position: string;
  /** Sasaran percakapan: 'team' atau 'investor'. Dicatat apa adanya. */
  intent: 'team' | 'investor';
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

/**
 * Tombol CTA yang mencatat kliknya.
 *
 * `mailto:` dirender sebagai <a> biasa . <Link> milik Next hanya untuk
 * navigasi dalam aplikasi, dan memakainya untuk skema mailto membuat prefetch
 * berjalan pada URL yang tidak akan pernah menjadi halaman.
 *
 * Properti yang dicatat sengaja hanya `position` dan `intent`: alamat email
 * tujuan TIDAK ikut dikirim (§12.1 . penjaga di lib/analytics juga akan
 * membuang kunci apa pun yang mengandung "email").
 */
export function BuildCta({
  href,
  position,
  intent,
  children,
  variant = 'primary',
  className = '',
}: BuildCtaProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-[15px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red';
  const cls = `${base} ${SKIN[variant]} ${className}`;
  const onClick = () => track('build_page_cta_clicked', { position, intent });

  if (href.startsWith('mailto:')) {
    return (
      <a href={href} onClick={onClick} className={cls}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={cls}>
      {children}
    </Link>
  );
}
