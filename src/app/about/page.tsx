import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import MobilePageHeader from '@/components/layout/MobilePageHeader';

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description: 'Tentang Posko Jasa, marketplace jasa terpercaya yang menghubungkan Anda dengan penyedia jasa di sekitar.',
  alternates: { canonical: 'https://poskojasa.com/about' },
};

export default function AboutPage() {
  return (
    <div className="page-h bg-brand-gray-60">
      <MobilePageHeader title="Tentang Kami" titleAs="p" backHref="/" maxWidthClass="max-w-md" />
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
        <h1 className="hidden lg:block text-3xl font-bold text-brand-gray-900 mb-4">Tentang Kami</h1>
        <p className="text-brand-gray-700 mb-6">POSKO Jasa adalah platform yang menghubungkan Anda dengan penyedia jasa terpercaya di sekitar Anda.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-red text-white text-sm font-semibold rounded-md hover:bg-brand-red-dark transition-colors">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
