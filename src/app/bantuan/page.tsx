"use client";

import Link from 'next/link';
import { LifeBuoy, BookOpen } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import SupportInbox from '@/components/support/SupportInbox';

// Kotak masuk CS sisi PELANGGAN. Kembarannya untuk mitra ada di
// /mitra/bantuan/chat . badannya komponen yang sama (SupportInbox), hanya
// kerangkanya yang berbeda.
export default function SupportListPage() {
  return (
    // `page-h`, bukan min-h-[100dvh]: di desktop ada TopNavbar setinggi 4rem,
    // dan 100dvh penuh membuat setiap halaman melebihi viewport (scrollbar
    // palsu di halaman yang isinya cuma beberapa kartu).
    <div className="page-h bg-brand-gray-60 pb-10">
      <MobilePageHeader
        title="Chat Customer Service"
        subtitle="Bantuan untuk akun pelanggan"
        icon={<LifeBuoy className="w-5 h-5 text-brand-red" />}
        maxWidthClass="max-w-2xl"
      />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <div className="hidden lg:block">
          <h1 className="flex items-center gap-2 text-xl font-bold text-brand-gray-900">
            <LifeBuoy className="w-5 h-5 text-brand-red" /> Chat Customer Service
          </h1>
          <p className="text-sm text-brand-gray-450 mt-0.5">Bantuan untuk akun pelanggan.</p>
        </div>

        <SupportInbox basePath="/bantuan" />

        {/* Jalan kembali ke FAQ. Tanpa ini halaman terasa buntu di desktop, di
            mana MobilePageHeader (dan tombol kembalinya) tidak dirender. */}
        <Link
          href="/help"
          className="flex items-center justify-center gap-2 rounded-lg border border-brand-gray-100 bg-white py-3 text-sm font-medium text-brand-gray-700 hover:border-brand-red/40"
        >
          <BookOpen className="w-4 h-4" /> Lihat pertanyaan umum (FAQ)
        </Link>
      </div>
    </div>
  );
}
