"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, MessageCircle, LifeBuoy, Flag, Scale } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface Faq {
  q: string;
  a: string;
}
interface FaqGroup {
  category: string;
  items: Faq[];
}

const FAQS: FaqGroup[] = [
  {
    category: 'Pemesanan',
    items: [
      { q: 'Bagaimana cara memesan jasa?', a: 'Cari layanan lewat Beranda atau menu Cari, buka detail layanan, lalu tekan "Pesan Sekarang". Pilih tanggal, jam, alamat, dan konfirmasi pesanan Anda.' },
      { q: 'Bisakah saya menjadwalkan pesanan untuk nanti?', a: 'Bisa. Saat memesan, pilih tanggal dan jam sesuai kebutuhan Anda. Mitra akan mengonfirmasi ketersediaan pada jadwal tersebut.' },
      { q: 'Bagaimana cara melacak status pesanan?', a: 'Buka menu Pesanan untuk melihat status setiap pesanan (Menunggu Konfirmasi, Sedang Dikerjakan, Selesai, dll). Ketuk pesanan untuk detail lengkap.' },
    ],
  },
  {
    category: 'Pembayaran',
    items: [
      { q: 'Metode pembayaran apa saja yang tersedia?', a: 'Anda dapat membayar menggunakan saldo dompet Posko atau metode pembayaran yang tersedia di halaman pembayaran (transfer, e-wallet, dan lainnya via Midtrans).' },
      { q: 'Apakah ada biaya tambahan saat memesan?', a: 'Harga yang ditampilkan sudah termasuk biaya layanan. Rincian total akan selalu ditampilkan sebelum Anda menyelesaikan pembayaran.' },
      { q: 'Mitra menambahkan tagihan tambahan, apa itu?', a: 'Untuk pekerjaan tertentu, mitra dapat mengajukan biaya tambahan (mis. penggantian sparepart). Anda perlu menyetujui dan membayarnya sebelum pekerjaan dilanjutkan — semua rinciannya transparan di halaman pesanan.' },
    ],
  },
  {
    category: 'Pembatalan & Refund',
    items: [
      { q: 'Bagaimana cara membatalkan pesanan?', a: 'Selama pesanan belum dikerjakan, buka detail pesanan lalu pilih Batalkan. Kebijakan pembatalan tergantung status pesanan saat itu.' },
      { q: 'Kapan dana refund saya kembali?', a: 'Refund akibat pembatalan atau mitra tidak datang (no-show) dikembalikan ke saldo dompet Anda dan dapat langsung digunakan atau ditarik.' },
      { q: 'Mitra tidak datang, bagaimana?', a: 'Laporkan lewat halaman pesanan atau ajukan sengketa. Jika terverifikasi sebagai no-show, dana Anda dikembalikan penuh ke saldo dompet.' },
    ],
  },
  {
    category: 'Akun & Keamanan',
    items: [
      { q: 'Bagaimana cara mengubah kata sandi?', a: 'Masuk ke Profil → Keamanan Akun → ubah kata sandi. Anda perlu memasukkan kata sandi lama untuk verifikasi.' },
      { q: 'Saya lupa kata sandi, apa yang harus dilakukan?', a: 'Di halaman Masuk, ketuk "Lupa password?" dan ikuti langkah pemulihan melalui nomor HP terdaftar Anda.' },
      { q: 'Bagaimana mengatur notifikasi?', a: 'Buka Profil → Notifikasi untuk mengatur notifikasi push dan email per kategori (update pesanan, promo, dan lainnya).' },
    ],
  },
  {
    category: 'Menjadi Mitra',
    items: [
      { q: 'Bagaimana cara mendaftar sebagai mitra?', a: 'Buka Profil dan pilih daftar sebagai Mitra, lalu lengkapi data dan dokumen verifikasi (KTP & swafoto). Tim kami akan meninjau pengajuan Anda.' },
      { q: 'Berapa komisi platform untuk mitra?', a: 'Platform mengambil komisi sebesar 12% dari setiap transaksi yang selesai. Sisanya masuk ke saldo dompet mitra.' },
      { q: 'Bagaimana cara menarik saldo (payout)?', a: 'Buka Dompet Mitra → Tarik Dana. Penarikan minimal Rp50.000, maksimal Rp10.000.000 per transaksi, dengan biaya admin Rp3.000.' },
    ],
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.map((g) => ({
      ...g,
      items: g.items.filter((it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const noResults = filtered.length === 0;

  return (
    <div className="page-h bg-[#f7f5f4] pb-16 lg:pb-10">
      {/* Hero + search */}
      <div className="bg-[#b51822] text-white">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <LifeBuoy className="w-10 h-10 mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl font-bold">Bantuan &amp; Dukungan</h1>
          <p className="text-white/80 text-sm mt-1">Cari jawaban cepat, atau hubungi tim kami.</p>
          <div className="relative mt-5">
            <Search className="w-5 h-5 text-[#8f6f6d] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari pertanyaan… (mis. refund, komisi)"
              className="w-full pl-10 pr-3 py-3 rounded-md text-sm text-[#1c1b1b] bg-white border border-transparent focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>
        </div>
      </div>

      {/* Hub bantuan — perjelas 3 kanal agar user tak bingung ke mana mengadu */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <h2 className="text-sm font-semibold text-[#8f6f6d] uppercase tracking-wide mb-2 px-1">Butuh bantuan apa?</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/bantuan" className="bg-white rounded-lg border border-[#e5e2e1] p-4 hover:border-[#b51822]/40 transition-colors">
            <MessageCircle className="w-6 h-6 text-[#b51822] mb-2" />
            <p className="text-sm font-semibold text-[#1c1b1b]">Chat Customer Service</p>
            <p className="text-xs text-[#5b403e] mt-1 leading-snug">Pertanyaan umum, akun, atau pembayaran. Tim CS membalas langsung di chat ini.</p>
          </Link>
          <Link href="/orders" className="bg-white rounded-lg border border-[#e5e2e1] p-4 hover:border-[#b51822]/40 transition-colors">
            <Scale className="w-6 h-6 text-[#b51822] mb-2" />
            <p className="text-sm font-semibold text-[#1c1b1b]">Sengketa Pesanan</p>
            <p className="text-xs text-[#5b403e] mt-1 leading-snug">Mitra tak datang, hasil tak sesuai, atau soal dana. Buka <strong>Pesanan → detail → Ajukan Sengketa</strong> (dana ditahan sampai CS memutuskan).</p>
          </Link>
          <div className="bg-white rounded-lg border border-[#e5e2e1] p-4">
            <Flag className="w-6 h-6 text-[#b51822] mb-2" />
            <p className="text-sm font-semibold text-[#1c1b1b]">Laporkan Mitra/Layanan</p>
            <p className="text-xs text-[#5b403e] mt-1 leading-snug">Konten tak pantas atau pelanggaran. Buka halaman mitra/layanan lalu tekan tombol <strong>&quot;Laporkan&quot;</strong>.</p>
          </div>
        </div>
      </div>

      {/* FAQ list */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {noResults ? (
          <EmptyState
            icon={Search}
            title="Tidak Ada Hasil"
            description={`Tidak ada pertanyaan yang cocok dengan "${query}". Coba kata kunci lain atau hubungi kami.`}
          />
        ) : (
          filtered.map((group) => (
            <section key={group.category}>
              <h2 className="text-sm font-semibold text-[#8f6f6d] uppercase tracking-wide mb-2 px-1">
                {group.category}
              </h2>
              <div className="bg-white rounded-lg border border-[#e5e2e1] divide-y divide-[#e5e2e1] overflow-hidden">
                {group.items.map((it) => {
                  const id = `${group.category}:${it.q}`;
                  const isOpen = open === id;
                  return (
                    <div key={id}>
                      <button
                        onClick={() => setOpen(isOpen ? null : id)}
                        className="w-full flex items-center justify-between gap-3 text-left px-4 py-3.5 hover:bg-[#f7f5f4] transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="text-sm font-medium text-[#1c1b1b]">{it.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#8f6f6d] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <p className="px-4 pb-4 -mt-1 text-sm text-[#5b403e] leading-relaxed">{it.a}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {/* Contact support */}
        <div className="bg-white rounded-lg border border-[#e5e2e1] p-5 text-center">
          <h3 className="text-base font-bold text-[#1c1b1b]">Masih butuh bantuan?</h3>
          <p className="text-sm text-[#5b403e] mt-1 mb-4">Tim dukungan kami siap membantu Anda.</p>
          <Link
            href="/bantuan"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#b51822] text-white text-sm font-bold rounded-md hover:bg-[#90121a] transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Chat dengan Customer Service
          </Link>
          <div className="mt-3">
            <Link href="/" className="text-sm font-medium text-[#8f6f6d] hover:text-[#5b403e]">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
