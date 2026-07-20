import React from 'react';
import Link from 'next/link';
import MobilePageHeader from '@/components/layout/MobilePageHeader';

export default function AboutPage() {
  return (
    <div className="page-h bg-[#f7f5f4]">
      <MobilePageHeader title="Tentang Kami" backHref="/" maxWidthClass="max-w-md" />
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
        <h1 className="hidden lg:block text-3xl font-bold text-[#1c1b1b] mb-4">Tentang Kami</h1>
        <p className="text-[#5b403e] mb-6">POSKO Jasa adalah platform yang menghubungkan Anda dengan penyedia jasa terpercaya di sekitar Anda.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#b51822] text-white text-sm font-semibold rounded-md hover:bg-[#90121a] transition-colors">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
