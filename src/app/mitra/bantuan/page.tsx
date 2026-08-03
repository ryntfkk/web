"use client";

import Link from 'next/link';
import { LifeBuoy, MessageCircle, FileText } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import FaqAccordion from '@/components/help/FaqAccordion';

// Halaman bantuan khusus mitra.
//
// Sebelumnya mitra tidak punya halaman bantuan sendiri: menu "Hubungi Kami" di
// profil mitra mengarah ke /help pelanggan, dan pertanyaan mitra (komisi,
// pencairan) nyempil sebagai satu kategori di sana.
export default function MitraBantuanPage() {
  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      <MobilePageHeader
        title="Bantuan Mitra"
        icon={<LifeBuoy className="w-5 h-5 text-brand-red" />}
        alwaysShow
      />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
        <h1 className="hidden lg:flex items-center gap-2 text-xl font-bold text-brand-gray-900">
          <LifeBuoy className="w-5 h-5 text-brand-red" /> Bantuan Mitra
        </h1>

        <FaqAccordion audience="PARTNER" placeholder="Cari pertanyaan… (mis. komisi, pencairan)" />

        <div className="bg-white rounded-lg border border-brand-gray-100 p-5 text-center">
          <h2 className="text-base font-bold text-brand-gray-900">Belum terjawab?</h2>
          <p className="text-sm text-brand-gray-700 mt-1 mb-4">
            Hubungi tim kami lewat chat, atau baca ketentuan yang berlaku.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/bantuan"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-red text-white text-sm font-bold rounded-md hover:bg-brand-red-dark transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Chat Customer Service
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-brand-gray-100 bg-white text-brand-gray-900 text-sm font-semibold rounded-md hover:bg-brand-gray-60 transition-colors"
            >
              <FileText className="w-4 h-4" /> Syarat &amp; Ketentuan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
