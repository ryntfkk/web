'use client';

import Link from 'next/link';
import { ArrowRight, Search, Store, Wallet } from 'lucide-react';
import { track } from '@/lib/analytics';

/**
 * Banner ajakan jadi mitra di home → /jadi-mitra.
 *
 * Client Component semata-mata demi satu event klik: tanpa itu funnel akuisisi
 * mitra putus di langkah pertama dan kita tak pernah tahu apakah banner ini
 * yang bekerja atau bukan. Tautannya sendiri tetap ikut ter-render di HTML awal
 * (Next me-render Client Component di server juga), jadi crawler tetap
 * menemukannya dan otoritas dari home tetap mengalir ke /jadi-mitra.
 *
 * Diletakkan setelah "Mitra Terpopuler" dengan sengaja: pembaca baru saja
 * melihat mitra yang sudah jalan, jadi ajakannya jatuh pada momen yang tepat.
 * Tanpa gambar . di sini gradien sudah cukup, dan aset baru di home hanya
 * menambah beban muat halaman yang paling sering dibuka.
 */

const POIN = [
  { Icon: Wallet, teks: 'Gratis, tanpa langganan' },
  { Icon: Search, teks: 'Muncul di pencarian Google' },
  { Icon: Store, teks: 'Kelola harga & jadwal sendiri' },
];

export default function PartnerCtaBanner() {
  return (
    <section className="mb-6 md:mb-8">
      <Link
        href="/jadi-mitra"
        onClick={() => track('home_partner_banner_clicked')}
        className="group block overflow-hidden rounded-xl bg-gradient-to-br from-brand-red to-brand-red-dark p-4 text-white transition-shadow hover:shadow-lg sm:rounded-2xl sm:p-7"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div className="min-w-0">
            <h2 className="mt-1 sm:mt-1.5 text-[15px] sm:text-[22px] font-bold leading-snug">
              Punya keahlian? Pasang jasa Anda di Posko.
            </h2>
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 sm:mt-4 sm:gap-x-4 sm:gap-y-2">
              {POIN.map(({ Icon, teks }) => (
                <li key={teks} className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-medium text-white/95 sm:text-white/90">
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" aria-hidden />
                  {teks}
                </li>
              ))}
            </ul>
          </div>

          <span className="inline-flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-[12px] sm:text-[13px] font-bold text-brand-red transition-transform group-hover:translate-x-0.5 sm:px-5 sm:py-2.5">
            Pelajari keuntungannya
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          </span>
        </div>
      </Link>
    </section>
  );
}
