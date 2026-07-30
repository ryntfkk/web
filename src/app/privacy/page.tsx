import React from 'react';
import Link from 'next/link';
import MobilePageHeader from '@/components/layout/MobilePageHeader';

export default function PrivacyPage() {
  return (
    <div className="page-h bg-brand-gray-60">
      <MobilePageHeader title="Kebijakan Privasi" backHref="/" maxWidthClass="max-w-md" />
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
        <h1 className="hidden lg:block text-3xl font-bold text-brand-gray-900 mb-4">Kebijakan Privasi</h1>
        <p className="text-brand-gray-700 mb-6">Halaman Kebijakan Privasi saat ini sedang dalam proses penyusunan dan akan segera tersedia.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-red text-white text-sm font-semibold rounded-md hover:bg-brand-red-dark transition-colors">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
