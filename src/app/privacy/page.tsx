import React from 'react';
import Link from 'next/link';
import MobilePageHeader from '@/components/layout/MobilePageHeader';

export default function PrivacyPage() {
  return (
    <div className="page-h bg-[#f7f5f4]">
      <MobilePageHeader title="Kebijakan Privasi" backHref="/" maxWidthClass="max-w-md" />
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
        <h1 className="hidden lg:block text-3xl font-bold text-[#1c1b1b] mb-4">Kebijakan Privasi</h1>
        <p className="text-[#5b403e] mb-6">Halaman Kebijakan Privasi saat ini sedang dalam proses penyusunan dan akan segera tersedia.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#b51822] text-white text-sm font-semibold rounded-md hover:bg-[#90121a] transition-colors">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
