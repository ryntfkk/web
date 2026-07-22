import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';

export const metadata: Metadata = {
  title: 'Promo & Diskon',
  description: 'Promo dan diskon layanan jasa terbaru di Posko Jasa.',
  alternates: { canonical: 'https://poskojasa.com/promos' },
};

export default function PromosPage() {
  return (
    <div className="page-h bg-[#f7f5f4]">
      <MobilePageHeader title="Promo Menarik" backHref="/" maxWidthClass="max-w-3xl" />

      {/* Empty State */}
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-md bg-[#f0eded] flex items-center justify-center mb-6">
          <Tag className="w-10 h-10 text-[#8f6f6d]" />
        </div>
        <h2 className="text-xl font-bold text-[#1c1b1b] mb-2">Belum Ada Promo Aktif</h2>
        <p className="text-[#5b403e] text-sm max-w-xs mb-8">
          Kunjungi halaman ini lagi nanti untuk mendapatkan penawaran spesial dari kami!
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#b51822] text-white text-sm font-bold rounded-md hover:bg-[#90121a] transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
