import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  Globe,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import JsonLd from '@/components/seo/JsonLd';
import FaqSection from '@/components/seo/FaqSection';
import { faqJsonLd } from '@/lib/seo';
import { getPlatformConfig } from '@/lib/config-server';
import { formatFeeRate } from '@/hooks/usePlatformConfig';
import { formatRupiah } from '@/lib/format';
import {
  COMPARE_ROWS,
  EARLY_ADVANTAGES,
  FLOW_STEPS,
  HERO_STATS,
  PREP_ITEMS,
  SEO_POINTS,
  SETUP_POINTS,
  partnerFaq,
} from '@/lib/partner-landing';
import { CtaDaftar, TrackLandingView } from './Cta';
import AnimateOnScroll from './AnimateOnScroll';

/**
 * Halaman akuisisi mitra.
 *
 * SENGAJA di root (/jadi-mitra), BUKAN di bawah /mitra. Seluruh area /mitra
 * ber-`robots: noindex` (mitra/layout.tsx), di-disallow robots.txt, dan
 * dipagari useRequireAuth . pengunjung anonim beserta Googlebot hanya akan
 * menerima halaman kosong di sana. Halaman yang tugasnya menjaring orang dari
 * hasil pencarian tidak bisa berdiri di belakang ketiga pagar itu.
 *
 * Server Component penuh: satu-satunya JS yang dikirim adalah pulau kecil di
 * ./Cta untuk analytics. Angka biaya diambil dari /config di server sehingga
 * perubahan admin terbawa tanpa redeploy Amplify, dan tetap ada di HTML awal.
 *
 * CATATAN: bila menambah rute root baru seperti ini, `RESERVED_ROOT_SEGMENTS`
 * di components/layout/HeaderWrapper.tsx WAJIB ikut diperbarui . kalau tidak,
 * rutenya dikira username mitra dan header hilang di mobile.
 */
export const revalidate = 600;

const SITE = 'https://poskojasa.com';

export const metadata: Metadata = {
  // Tanpa "Posko Jasa": template root sudah menambahkan "| Posko Jasa". Menulisnya
  // di sini membuat merek tercetak dua kali dan judulnya terpotong di hasil
  // pencarian. Judul OG di bawah boleh memuatnya . OG tidak kena template.
  title: 'Jadi Mitra - Pasang Jasa Gratis, Ditemukan di Google',
  description:
    'Daftar jadi mitra Posko Jasa tanpa biaya pendaftaran, langganan, atau iklan. Setiap layanan Anda mendapat halaman sendiri yang bisa ditemukan lewat pencarian Google, lengkap dengan harga, jadwal, dan pembayaran yang terjamin.',
  alternates: { canonical: `${SITE}/jadi-mitra` },
  // `images`, `siteName`, dan `locale` WAJIB diulang di sini. Next MENGGANTI
  // objek openGraph milik root layout, tidak menggabungnya . tanpa ini halaman
  // terkirim tanpa og:image sama sekali. Justru halaman inilah yang paling
  // sering dibagikan lewat WhatsApp, tempat pratinjau tanpa gambar praktis
  // tidak diklik. Aturan yang sama pernah menjatuhkan /kategori & /jasa.
  openGraph: {
    title: 'Jadi Mitra Posko Jasa - Pasang Jasa Gratis, Ditemukan di Google',
    description:
      'Tanpa biaya pendaftaran dan langganan. Layanan Anda punya halaman permanen yang terbaca mesin pencari, bukan postingan yang tenggelam dalam hitungan jam.',
    url: `${SITE}/jadi-mitra`,
    type: 'website',
    locale: 'id_ID',
    siteName: 'Posko Jasa',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Jadi mitra Posko Jasa - pasang jasa gratis',
      },
    ],
  },
};

/* ── Flow step icons ── */
const FLOW_ICONS = [Zap, Check, MessageSquare, BadgeCheck, Wallet];

export default async function JadiMitraPage() {
  const cfg = await getPlatformConfig();
  const faq = partnerFaq(cfg);

  const komisi = formatFeeRate(cfg.platform_fee_rate);
  const biayaTarik = formatRupiah(cfg.withdrawal_fee);
  const hargaMin = formatRupiah(cfg.min_transaction);

  // Angka nol ditulis lewat formatRupiah juga, bukan literal "Rp 0" . supaya
  // format ribuan/spasi persis sama dengan baris berbayar di bawahnya.
  const gratis = formatRupiah(0);

  const barisBiaya = [
    { label: 'Biaya pendaftaran', nilai: gratis, gratisFlag: true },
    { label: 'Langganan bulanan', nilai: gratis, gratisFlag: true },
    { label: 'Biaya iklan & promosi', nilai: gratis, gratisFlag: true },
    { label: 'Komisi per pesanan selesai', nilai: komisi, gratisFlag: false },
    { label: 'Biaya penarikan saldo', nilai: biayaTarik, gratisFlag: false },
  ];

  return (
    <div className="page-h bg-brand-gray-50 pb-28 sm:pb-16 relative">
      <JsonLd data={faqJsonLd(faq)} />
      <TrackLandingView />

      {/* ════════════════════════════════════════════════════════════════
          HERO . Premium, Glassmorphism
          ════════════════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden bg-brand-gray-900 text-white">
        {/* Dynamic Glowing Background Effects */}
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-red/30 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full bg-brand-red-dark/40 blur-[80px]" />
        
        {/* Grid pattern overlay for tech/premium feel */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="relative mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold tracking-wide backdrop-blur-md shadow-xl">
              <Sparkles className="h-3.5 w-3.5 text-brand-red-light" /> Pendaftaran mitra sedang dibuka
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.15] tracking-tight">
              Pasang jasa Anda di Posko.<br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-brand-red-light to-white bg-clip-text text-transparent">Ditemukan di Google</span>
            </h1>
            <p className="mt-4 text-[14px] sm:text-[16px] leading-relaxed text-white/80 max-w-xl">
              Berhenti repost tiap hari. Tiap layanan Anda punya halaman permanen yang langsung terbaca oleh mesin pencari.
            </p>

            {/* ── CTA buttons ── */}
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <CtaDaftar
                position="hero"
                className="w-full !bg-brand-red !text-white hover:!bg-brand-red-dark shadow-brand-red sm:w-auto py-3.5 text-base"
              />
              <Link
                href="#biaya"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-6 py-3.5 text-[14px] font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto"
              >
                Lihat rincian biaya
              </Link>
            </div>
            
            {/* ── Stat pills ── */}
            <div className="mt-10 grid grid-cols-3 gap-3 w-full sm:flex sm:flex-wrap sm:gap-4">
              {HERO_STATS.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-md sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-left"
                >
                  <span className="text-xl sm:text-2xl font-black leading-none text-white">
                    {s.angka}
                  </span>
                  <span className="mt-1 sm:mt-0 text-[10px] sm:text-[12px] font-medium leading-tight text-white/70">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          PERBANDINGAN . Versus Cards (Mobile Optimized)
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
          <div className="text-center sm:text-left">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-brand-red">
              Bedanya di Mana
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-gray-900 tracking-tight">
              Kelebihan Halaman Sendiri
            </h2>
          </div>

          <div className="mt-8 space-y-4 sm:space-y-6">
            {COMPARE_ROWS.map((row, i) => (
              <AnimateOnScroll key={row.aspek} delay={i * 60}>
                <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brand-gray-100">
                  {/* Judul Aspek */}
                  <div className="bg-brand-gray-50 px-4 py-3 sm:w-1/3 sm:flex sm:items-center sm:bg-transparent sm:border-r sm:border-brand-gray-100">
                    <p className="text-[13px] sm:text-[14px] font-extrabold text-brand-gray-900">
                      {row.aspek}
                    </p>
                  </div>
                  
                  {/* Grid Perbandingan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-brand-gray-100 flex-1">
                    <div className="flex items-start gap-3 p-4 sm:p-5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-5">
                        <X className="h-20 w-20 text-brand-gray-900" />
                      </div>
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-gray-200">
                        <X className="h-3 w-3 text-brand-gray-700" aria-hidden />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-gray-450 mb-1">Cara Lama</p>
                        <p className="text-[13px] leading-relaxed text-brand-gray-700 relative z-10">
                          {row.lama}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-4 sm:p-5 bg-brand-success-soft/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-5">
                        <Check className="h-20 w-20 text-brand-success" />
                      </div>
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-success text-white shadow-sm shadow-brand-success/30">
                        <Check className="h-3 w-3" aria-hidden />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-success-dark mb-1">Di Posko</p>
                        <p className="text-[13px] font-semibold leading-relaxed text-brand-gray-900 relative z-10">
                          {row.posko}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SEO . Elegant Stacked Cards
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="bg-white py-12 sm:py-16 border-y border-brand-gray-100">
          <div className="mx-auto w-full max-w-3xl px-4">
            <div className="text-center sm:text-left">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-brand-red">
                Ditemukan di Google
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-gray-900 tracking-tight">
                Kenapa jasa Anda bisa muncul?
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-brand-gray-700 max-w-lg mx-auto sm:mx-0">
                Halaman di Posko terbuka, permanen, dan didaftarkan otomatis ke sitemap yang dibaca mesin pencari.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {SEO_POINTS.map((p, i) => (
                <AnimateOnScroll key={p.judul} delay={i * 80}>
                  <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-brand-gray-200 bg-brand-gray-50 p-6 transition-all hover:shadow-lg hover:border-brand-red/30 group">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red text-white shadow-sm group-hover:scale-110 transition-transform">
                      <Search className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-[15px] font-extrabold text-brand-gray-900 leading-snug">{p.judul}</h3>
                    <div className="mb-3 w-fit rounded-md border border-brand-gray-200 bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium text-brand-gray-700 shadow-sm">
                      {p.contoh}
                    </div>
                    <p className="text-[13px] leading-relaxed text-brand-gray-700 flex-1">
                      {p.isi}
                    </p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>

            <p className="mt-8 mx-auto sm:mx-0 max-w-2xl text-center sm:text-left text-[12px] leading-relaxed text-brand-gray-450 bg-brand-gray-50 rounded-xl p-4 border border-brand-gray-100">
              <span className="font-semibold text-brand-gray-700">Catatan:</span> Terindeks bukan jaminan peringkat satu. Yang Posko pastikan adalah halaman Anda eksis, permanen, dan siap dibaca mesin pencari.
            </p>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SETUP LAYANAN . Prominent Icon Grid
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
          <div className="text-center">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-brand-red">
              Sekali Atur
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-gray-900 tracking-tight">
              Berhenti Jelaskan Harga Berulang Kali
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {SETUP_POINTS.map((p, i) => (
              <AnimateOnScroll key={p.judul} delay={i * 50}>
                <div className="group flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-gray-100 transition-all hover:shadow-md hover:ring-brand-red/30">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-brand-red transition-transform group-hover:rotate-12 group-hover:scale-110">
                    <BadgeCheck className="h-6 w-6" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-[15px] font-bold text-brand-gray-900">{p.judul}</h3>
                    <p className="text-[13px] leading-relaxed text-brand-gray-700">{p.isi}</p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          ALUR TRANSAKSI . Vertical Timeline (Mobile Optimized)
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="bg-brand-gray-900 py-12 sm:py-16 text-white sm:rounded-3xl sm:mx-4 md:mx-auto max-w-4xl relative overflow-hidden">
          {/* Subtle bg glow */}
          <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-brand-red/20 blur-[80px]" />
          
          <div className="mx-auto w-full max-w-3xl px-6 relative z-10">
            <div className="text-center mb-10">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-brand-red-light">
                Saat Pesanan Masuk
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Anda Kerjakan, Uangnya Beres
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-white/70">
                Pelanggan membayar ke sistem sebelum Anda berangkat.
              </p>
            </div>

            {/* Timeline Vertikal Khusus HP / Grid di Desktop */}
            <div className="relative">
              {/* Garis vertikal penghubung (hanya mobile) */}
              <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-white/10 sm:hidden"></div>

              <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-5 sm:gap-4 relative">
                {FLOW_STEPS.map((s, i) => {
                  const Icon = FLOW_ICONS[i] ?? Zap;
                  return (
                    <AnimateOnScroll key={s.judul} delay={i * 80}>
                      <div className="relative flex items-start gap-4 sm:flex-col sm:items-center sm:text-center group">
                        {/* Garis horizontal penghubung (hanya desktop) */}
                        {i < FLOW_STEPS.length - 1 && (
                          <div className="hidden sm:block absolute top-6 left-[60%] w-[80%] h-0.5 bg-white/10"></div>
                        )}
                        
                        {/* Nomor/Ikon Bulat */}
                        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-gray-800 text-brand-red-light ring-4 ring-brand-gray-900 transition-transform group-hover:scale-110 group-hover:bg-brand-red group-hover:text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        
                        {/* Teks */}
                        <div className="pt-2 sm:pt-0">
                          <h3 className="text-[14px] font-bold leading-tight mb-1">{s.judul}</h3>
                          <p className="text-[12px] leading-relaxed text-white/60">{s.isi}</p>
                        </div>
                      </div>
                    </AnimateOnScroll>
                  );
                })}
              </div>
            </div>

            {/* Info Keamanan */}
            <div className="mt-12 flex gap-3 rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 backdrop-blur-sm mx-auto max-w-2xl">
              <ShieldCheck className="h-6 w-6 shrink-0 text-brand-success-light" aria-hidden />
              <p className="text-[12px] sm:text-[13px] leading-relaxed text-white/80">
                <strong className="text-white">Ada selisih paham?</strong> Pesanan bisa dibawa ke jalur sengketa. Dana ditahan sampai tim Posko memutuskan - sebuah perlindungan fair untuk kedua belah pihak.
              </p>
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          BIAYA . Setruk/Tiket Modern
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section id="biaya" className="mx-auto w-full max-w-xl px-4 py-12 sm:py-16">
          <div className="text-center mb-8">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-brand-red">
              Transparan
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-gray-900 tracking-tight">
              Tidak Ada Ruginya Bergabung
            </h2>
            <p className="mt-3 text-[14px] text-brand-gray-700">
              Kami baru menerima komisi jika Anda sudah mendapatkan penghasilan.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-brand-gray-200/50 ring-1 ring-brand-gray-200">
            {/* Header Setruk */}
            <div className="bg-brand-gray-900 px-6 py-4 text-white text-center">
              <p className="text-[11px] font-mono tracking-widest text-white/60 mb-1">STRUKTUR BIAYA</p>
              <p className="text-[16px] font-bold">Posko Jasa Partner</p>
            </div>
            
            {/* Edge zigzag effect via pseudo elements (CSS trick simplified to borders) */}
            <div className="border-b-[3px] border-dashed border-brand-gray-200"></div>

            <div className="p-6">
              <dl className="space-y-4">
                {barisBiaya.map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center justify-between gap-4"
                  >
                    <dt className="text-[13px] font-medium text-brand-gray-700">{b.label}</dt>
                    <dd className="shrink-0">
                      {b.gratisFlag ? (
                        <span className="inline-flex items-center rounded bg-brand-success px-2.5 py-1 text-[13px] font-bold text-white shadow-sm">
                          GRATIS ({b.nilai})
                        </span>
                      ) : (
                        <span className="text-[14px] font-bold text-brand-gray-900">{b.nilai}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              
              <div className="mt-8 rounded-xl bg-brand-success-soft/30 p-4 border border-brand-success/20">
                <p className="text-center text-[12px] sm:text-[13px] font-semibold leading-relaxed text-brand-success-dark">
                  Tidak ada pesanan = tidak ada biaya.<br/>Komisi {komisi} hanya dipotong dari pesanan yang sukses.
                </p>
              </div>
            </div>
          </div>

          {/* Syarat masuk */}
          <div className="mt-6 flex gap-3 rounded-2xl border border-brand-warning-light/50 bg-brand-warning-light/20 p-4 max-w-xl mx-auto">
            <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-brand-amber-dark" aria-hidden />
            <p className="text-[12px] sm:text-[13px] leading-relaxed text-brand-gray-800 font-medium">
              Syarat minimal harga layanan adalah <span className="font-bold">{hargaMin}</span>. Bila biasanya di bawah itu, Anda bisa menggabungkannya menjadi satu paket layanan.
            </p>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          KEUNGGULAN PENDAFTAR AWAL . Premium Gradient Cards
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="bg-brand-gray-900 py-12 sm:py-16 text-white sm:rounded-3xl sm:mx-4 md:mx-auto max-w-4xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-red-dark/40 via-transparent to-transparent opacity-60"></div>
          
          <div className="mx-auto w-full max-w-3xl px-6 relative z-10">
            <div className="text-center sm:text-left mb-8">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-brand-warning">
                Fase Pendaftar Awal (Early Bird)
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Keuntungan yang Hanya Berlaku Sekarang
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {EARLY_ADVANTAGES.map((a, i) => (
                <AnimateOnScroll key={a.judul} delay={i * 80}>
                  <div className="group h-full flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-5 border border-white/10 backdrop-blur-sm transition-all hover:from-brand-red/20 hover:to-white/5 hover:border-brand-red/30">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-warning/20 text-brand-warning">
                      <Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12 group-hover:scale-110" aria-hidden />
                    </div>
                    <h3 className="mb-2 text-[15px] font-bold text-white">{a.judul}</h3>
                    <p className="text-[12px] leading-relaxed text-white/70 flex-1">{a.isi}</p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          PERSIAPAN DAFTAR
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
          <div className="text-center sm:text-left">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-brand-red">
              Langkah Terakhir
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-gray-900 tracking-tight">
              Siapkan 5 Hal Ini, Sisanya Kami Pandu
            </h2>
          </div>

          <div className="mt-8 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-brand-gray-100">
            <ul className="divide-y divide-brand-gray-100">
              {PREP_ITEMS.map((item, i) => (
                <AnimateOnScroll key={item} delay={i * 40}>
                  <li className="flex items-center gap-4 px-4 py-4 group transition-colors hover:bg-brand-gray-50/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
                      <Check className="h-4 w-4" aria-hidden />
                    </div>
                    <span className="text-[13px] sm:text-[14px] font-medium text-brand-gray-800">
                      {item}
                    </span>
                  </li>
                </AnimateOnScroll>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-center sm:text-left text-[12px] leading-relaxed text-brand-gray-450 max-w-xl">
            Begitu formulir terkirim, akun Anda langsung aktif dan layanan Anda langsung bisa
            dipesan. Verifikasi identitas (KTP + rekening) menyusul saat Anda ingin menarik dana.
          </p>
        </section>
      </AnimateOnScroll>

      {/* ── FAQ ── */}
      <AnimateOnScroll>
        <div className="mx-auto w-full max-w-3xl px-4 pb-12">
          <FaqSection items={faq} title="Pertanyaan Calon Mitra" />
        </div>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          PENUTUP . Bold CTA Card
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="mx-auto w-full max-w-3xl px-4 pb-12">
          <div className="relative overflow-hidden rounded-3xl bg-brand-red p-8 text-center sm:p-12 shadow-2xl shadow-brand-red/30">
            {/* Decorative */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-black/10 blur-2xl" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Mulai dari Satu Layanan Saja
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-white/90">
                Pasang satu jasa yang paling sering Anda kerjakan, lihat bagaimana hasilnya, lalu tambah yang lain secara bertahap.
              </p>
              
              <div className="mt-8 flex justify-center">
                <CtaDaftar
                  position="penutup"
                  className="!bg-white !text-brand-red hover:!bg-brand-gray-50 hover:scale-105 transition-transform font-bold px-8 py-3.5 text-[15px] shadow-lg shadow-black/10"
                />
              </div>
              
              <p className="mt-5 text-[11px] text-white/70">
                Dengan mendaftar, Anda menyetujui{' '}
                <Link href="/terms" className="underline hover:text-white transition-colors">
                  Syarat & Ketentuan
                </Link>{' '}
                serta{' '}
                <Link href="/privacy" className="underline hover:text-white transition-colors">
                  Kebijakan Privasi
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-[13px] font-medium text-brand-gray-700">
            Sudah jadi mitra?{' '}
            <Link href="/mitra/dashboard" className="text-brand-red hover:text-brand-red-dark hover:underline underline-offset-2 transition-colors">
              Masuk ke dasbor mitra
              <ArrowRight className="ml-1 inline h-4 w-4 align-text-bottom" />
            </Link>
          </p>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          STICKY BOTTOM CTA (Mobile Only)
          ════════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-gray-200 bg-white/80 p-4 backdrop-blur-lg sm:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <CtaDaftar
          position="sticky-mobile"
          className="w-full !bg-brand-red !text-white hover:!bg-brand-red-dark py-3.5 text-[15px] font-bold shadow-md shadow-brand-red/20"
        />
      </div>
    </div>
  );
}
