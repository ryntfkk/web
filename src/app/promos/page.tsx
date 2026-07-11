import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Tag } from 'lucide-react';

export default function PromosPage() {
  return (
    <div className="page-h bg-[#f7f5f4]">
      {/* Sticky Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-16 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-4">
          <Link href="/" className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded-md transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </Link>
          <h1 className="text-base font-bold text-[#1c1b1b]">Promo Menarik</h1>
        </div>
      </div>

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
