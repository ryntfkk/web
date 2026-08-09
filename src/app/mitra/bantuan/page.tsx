"use client";

import Link from 'next/link';
import { MessageCircle, FileText, Scale, Flag } from 'lucide-react';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import FaqAccordion from '@/components/help/FaqAccordion';

// Halaman bantuan khusus mitra.
//
// Sebelumnya mitra tidak punya halaman bantuan sendiri: menu "Hubungi Kami" di
// profil mitra mengarah ke /help pelanggan, dan pertanyaan mitra (komisi,
// pencairan) nyempil sebagai satu kategori di sana.
export default function MitraBantuanPage() {
  return (
    <div className="pb-6">
      {/* MitraPageHeader, bukan MobilePageHeader mentah: yang mentah default ke
          `max-w-lg` sehingga judulnya berhenti 160px sebelum kartu di bawahnya,
          dan tanpa tombol kembali halaman ini jadi jalan buntu di desktop
          (mode mitra tak punya TopNavbar). */}
      <MitraPageHeader
        title="Bantuan Mitra"
        variant="form"
        backHref="/mitra/profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Bantuan' }]}
      />

      <MitraPageContainer variant="form" className="space-y-6">
        {/* Hub kanal . cerminan hub di /help, tapi berisi kanal yang benar-benar
            dimiliki mitra. Menu profil sudah menjanjikan "FAQ mitra, chat CS &
            sengketa" sejak lama, sementara halaman ini cuma punya yang pertama
            dan kedua. */}
        <div>
          <h2 className="text-sm font-semibold text-brand-gray-400 uppercase tracking-wide mb-2 px-1">
            Butuh bantuan apa?
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/mitra/bantuan/chat"
              className="bg-white rounded-lg border border-brand-gray-100 p-4 hover:border-brand-red/40 transition-colors"
            >
              <MessageCircle className="w-6 h-6 text-brand-red mb-2" />
              <p className="text-sm font-semibold text-brand-gray-900">Chat Customer Service</p>
              <p className="text-xs text-brand-gray-700 mt-1 leading-snug">
                Komisi, pencairan, verifikasi, atau akun. Tim CS membalas langsung di chat ini.
              </p>
            </Link>
            <Link
              href="/mitra/orders"
              className="bg-white rounded-lg border border-brand-gray-100 p-4 hover:border-brand-red/40 transition-colors"
            >
              <Scale className="w-6 h-6 text-brand-red mb-2" />
              <p className="text-sm font-semibold text-brand-gray-900">Sengketa Pesanan</p>
              <p className="text-xs text-brand-gray-700 mt-1 leading-snug">
                Pelanggan tak bisa dihubungi, lokasi tak sesuai, atau soal dana. Buka{' '}
                <strong>Pesanan → detail → Ajukan Sengketa</strong>.
              </p>
            </Link>
            <Link
              href="/mitra/reviews"
              className="bg-white rounded-lg border border-brand-gray-100 p-4 hover:border-brand-red/40 transition-colors"
            >
              <Flag className="w-6 h-6 text-brand-red mb-2" />
              <p className="text-sm font-semibold text-brand-gray-900">Laporkan Ulasan</p>
              <p className="text-xs text-brand-gray-700 mt-1 leading-snug">
                Ulasan yang tidak pantas atau tidak benar. Buka <strong>Ulasan</strong> lalu tekan{' '}
                <strong>&quot;Laporkan&quot;</strong>.
              </p>
            </Link>
          </div>
        </div>

        <FaqAccordion audience="PARTNER" placeholder="Cari pertanyaan… (mis. komisi, pencairan)" />

        <div className="bg-white rounded-lg border border-brand-gray-100 p-5 text-center">
          <h2 className="text-base font-bold text-brand-gray-900">Belum terjawab?</h2>
          <p className="text-sm text-brand-gray-700 mt-1 mb-4">
            Hubungi tim kami lewat chat, atau baca ketentuan yang berlaku.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/mitra/bantuan/chat"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-red text-white text-sm font-bold rounded-md hover:bg-brand-red-dark transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Chat Customer Service
            </Link>
            {/* Label sengaja TIDAK menyebut "Mitra": tujuannya /terms, yaitu
                ketentuan pelanggan. Ketentuan khusus mitra ada di
                /legal/partner-terms dan MASIH DRAF (memuat "[NAMA BADAN USAHA]"
                harfiah), jadi menautkannya sekarang menerbitkan draf itu.
                Ganti tautan ini begitu partner-terms terbit. */}
            <Link
              href="/terms"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-brand-gray-100 bg-white text-brand-gray-900 text-sm font-semibold rounded-md hover:bg-brand-gray-60 transition-colors"
            >
              <FileText className="w-4 h-4" /> Syarat &amp; Ketentuan
            </Link>
          </div>
        </div>
      </MitraPageContainer>
    </div>
  );
}
