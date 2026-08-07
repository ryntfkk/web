'use client';

import Link from 'next/link';
import { ArrowRight, Search, Store, Wallet, Sparkles } from 'lucide-react';
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
  { Icon: Wallet, teks: 'Daftar Gratis' },
  { Icon: Search, teks: 'Muncul di pencarian Google' },
];

export default function PartnerCtaBanner() {
  return (
    <section className="mb-6 md:mb-8">
      <Link
        href="/jadi-mitra"
        onClick={() => track('home_partner_banner_clicked')}
        className="group relative block overflow-hidden rounded-2xl bg-brand-gray-900 p-4 sm:p-8 text-white transition-all hover:shadow-2xl hover:shadow-brand-red/20"
      >
        {/* Decorative Background Elements */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-red/20 blur-[60px] transition-transform duration-700 group-hover:scale-110" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-brand-red-dark/30 blur-[50px] transition-transform duration-700 group-hover:scale-110" />

        {/* Grid pattern overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px]"></div>

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] sm:text-[11px] font-semibold uppercase tracking-widest text-brand-red-light backdrop-blur-sm shadow-sm">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Peluang Terbuka
            </div>

            <h2 className="mt-0.5 sm:mt-1.5 text-[17px] sm:text-[26px] font-extrabold leading-[1.25] tracking-tight">
              Punya keahlian? <br className="hidden sm:block" />
              <span className="text-white/90">Pasang jasa Anda di Posko.</span>
            </h2>

            <ul className="mt-3.5 flex flex-wrap gap-1.5 sm:mt-6 sm:gap-3">
              {POIN.map(({ Icon, teks }) => (
                <li key={teks} className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2 py-1.5 sm:rounded-xl sm:px-3.5 sm:py-2.5 text-[10px] sm:text-[12px] font-medium text-white/90 backdrop-blur-sm transition-colors group-hover:border-white/10 group-hover:bg-white/10">
                  <div className="flex h-4 w-4 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-brand-red/20 text-brand-red-light">
                    <Icon className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" aria-hidden />
                  </div>
                  {teks}
                </li>
              ))}
            </ul>
          </div>

          <span className="inline-flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-2.5 sm:px-6 sm:py-3.5 text-[12px] sm:text-[14px] font-bold text-white shadow-lg shadow-brand-red/20 transition-all group-hover:-translate-y-0.5 group-hover:bg-brand-red-dark group-hover:shadow-brand-red/40">
            Pelajari Keuntungannya
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </div>
      </Link>
    </section>
  );
}
