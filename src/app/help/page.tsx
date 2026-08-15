import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, LifeBuoy, Flag, Scale, Store } from 'lucide-react';
import FaqAccordion from '@/components/help/FaqAccordion';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import JsonLd from '@/components/seo/JsonLd';
import { faqJsonLd } from '@/lib/seo';
import { getFaqsRendered, flattenFaq } from '@/lib/faq-server';

// FAQ dari tabel `faqs` (dikelola admin), bukan array di berkas ini.
// Jangan menambahkan pertanyaan sebagai konstanta lagi . tambahkan lewat
// /dashboard/faqs. Lihat PLAN-KONTEN-LEGAL-CMS.md §16.
//
// Server Component: isinya diambil di server supaya HTML pertama sudah memuat
// teks FAQ. Sempat sebaliknya setelah Fase 4 . halaman terkirim kosong dan baru
// terisi setelah JS jalan. Interaksi (cari, buka-tutup) tetap di klien lewat
// FaqAccordion.
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Bantuan & Dukungan',
  description:
    'Pertanyaan yang sering diajukan seputar pemesanan, pembayaran, pembatalan, refund, dan akun di POSKO Jasa.',
  alternates: { canonical: 'https://poskojasa.com/help' },
};

export default async function HelpPage() {
  const groups = await getFaqsRendered('CUSTOMER');
  const faqList = flattenFaq(groups);
  return (
    <div className="page-h bg-brand-gray-60 pb-16 lg:pb-10">
      {/* Rich result FAQ. Jawaban sudah diinterpolasi di server . kalau tidak,
          mesin pencari membaca "{{platform_fee_rate}}" mentah. */}
      {faqList.length > 0 && <JsonLd data={faqJsonLd(faqList)} />}
      {/* /help masuk MOBILE_HIDE_PATHS (TopNavbar mundur di mobile), jadi header
          ini satu-satunya tombol kembali. titleAs="p": H1 halaman ada di hero. */}
      <MobilePageHeader title="Bantuan & Dukungan" titleAs="p" backHref="/" maxWidthClass="max-w-3xl" />
      {/* Hero + search */}
      <div className="bg-brand-red text-white">
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <LifeBuoy className="w-10 h-10 mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl font-bold">Bantuan &amp; Dukungan</h1>
          <p className="text-white/80 text-sm mt-1">
            Untuk <strong className="font-semibold">pelanggan</strong> . cari jawaban cepat, atau hubungi tim kami.
          </p>
          {/* Pemisah audiens paling awal yang mungkin. "/help" dan "/bantuan"
              sama-sama berarti bantuan, dan mitra yang mendarat di sini tidak
              punya petunjuk bahwa FAQ-nya ada di tempat lain. */}
          <Link
            href="/mitra/bantuan"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25 transition-colors"
          >
            <Store className="w-3.5 h-3.5" /> Anda mitra? Buka Bantuan Mitra
          </Link>
        </div>
      </div>

      {/* Hub bantuan . perjelas 3 kanal agar user tak bingung ke mana mengadu.
          `max-w-3xl` + 2 kolom di sm: pada 640-672px varian lama memampatkan
          tiga kartu menjadi ~200px masing-masing, padahal isinya paragraf
          20+ kata. */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <h2 className="text-sm font-semibold text-brand-gray-400 uppercase tracking-wide mb-2 px-1">Butuh bantuan apa?</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/bantuan" className="bg-white rounded-lg border border-brand-gray-100 p-4 hover:border-brand-red/40 transition-colors">
            <MessageCircle className="w-6 h-6 text-brand-red mb-2" />
            <p className="text-sm font-semibold text-brand-gray-900">Chat Customer Service</p>
            <p className="text-xs text-brand-gray-700 mt-1 leading-snug">Pertanyaan umum, akun, atau pembayaran. Tim CS membalas langsung di chat ini.</p>
          </Link>
          <Link href="/orders" className="bg-white rounded-lg border border-brand-gray-100 p-4 hover:border-brand-red/40 transition-colors">
            <Scale className="w-6 h-6 text-brand-red mb-2" />
            <p className="text-sm font-semibold text-brand-gray-900">Sengketa Pesanan</p>
            <p className="text-xs text-brand-gray-700 mt-1 leading-snug">Mitra tak datang, hasil tak sesuai, atau soal dana. Buka <strong>Pesanan → detail → Ajukan Sengketa</strong> (dana ditahan sampai CS memutuskan).</p>
          </Link>
          <Link href="/services" className="bg-white rounded-lg border border-brand-gray-100 p-4 hover:border-brand-red/40 transition-colors">
            <Flag className="w-6 h-6 text-brand-red mb-2" />
            <p className="text-sm font-semibold text-brand-gray-900">Laporkan Mitra/Layanan</p>
            <p className="text-xs text-brand-gray-700 mt-1 leading-snug">Konten tak pantas atau pelanggaran. Buka halaman mitra/layanan lalu tekan tombol <strong>&quot;Laporkan&quot;</strong>.</p>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Pencarian menyatu di FaqAccordion supaya input dan hasil filter
            tidak terpisah state-nya. */}
        <FaqAccordion
          audience="CUSTOMER"
          placeholder="Cari pertanyaan… (mis. refund, komisi)"
          initialGroups={groups}
        />

        {/* Contact support */}
        <div className="bg-white rounded-lg border border-brand-gray-100 p-5 text-center">
          <h3 className="text-base font-bold text-brand-gray-900">Masih butuh bantuan?</h3>
          <p className="text-sm text-brand-gray-700 mt-1 mb-4">Tim dukungan kami siap membantu Anda.</p>
          <Link
            href="/bantuan"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-red text-white text-sm font-bold rounded-md hover:bg-brand-red-dark transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Chat dengan Customer Service
          </Link>
          <div className="mt-3">
            <Link href="/" className="text-sm font-medium text-brand-gray-400 hover:text-brand-gray-700">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
