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
    <div className="page-h bg-brand-gray-60 pb-16">
      <JsonLd data={faqJsonLd(faq)} />
      <TrackLandingView />

      {/* ════════════════════════════════════════════════════════════════
          HERO . Compact, impactful, stat pills
          ════════════════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-red via-brand-red to-brand-red-dark text-white">
        {/* Subtle decorative circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] sm:text-[12px] font-semibold backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> Pendaftaran mitra sedang dibuka
          </p>
          <h1 className="text-[22px] sm:text-3xl md:text-4xl font-extrabold leading-[1.2]">
            Pasang jasa Anda di Posko .{' '}
            <span className="text-white/90">ditemukan di Google</span>
          </h1>
          <p className="mt-3 text-[13px] sm:text-[15px] leading-relaxed text-white/85 max-w-xl">
            Berhenti repost tiap hari. Tiap layanan Anda punya halaman permanen
            yang terbaca mesin pencari.
          </p>

          {/* ── Stat pills ── */}
          <div className="mt-5 flex flex-wrap gap-2">
            {HERO_STATS.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2.5 backdrop-blur-sm"
              >
                <span className="text-[18px] sm:text-[20px] font-extrabold leading-none">
                  {s.angka}
                </span>
                <span className="text-[11px] sm:text-[12px] font-medium text-white/80 leading-tight">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* ── CTA buttons ── */}
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <CtaDaftar
              position="hero"
              className="!bg-white !text-brand-red hover:!bg-white/90 shadow-sm"
            />
            <Link
              href="#biaya"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 px-5 py-2.5 text-[13px] sm:text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Lihat rincian biaya
            </Link>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          PERBANDINGAN . Compact visual grid
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
          <p className="mb-1 text-[11px] sm:text-[12px] font-bold uppercase tracking-wide text-brand-red">
            Bedanya di mana
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-brand-gray-900">
            Yang berubah setelah punya halaman sendiri
          </h2>

          <div className="mt-5 space-y-2.5">
            {COMPARE_ROWS.map((row, i) => (
              <AnimateOnScroll key={row.aspek} delay={i * 60}>
                <div className="overflow-hidden rounded-xl border border-brand-gray-100 bg-white">
                  <p className="bg-brand-gray-50 px-3.5 py-2 text-[12px] sm:text-[13px] font-bold text-brand-gray-900">
                    {row.aspek}
                  </p>
                  <div className="grid grid-cols-2 divide-x divide-brand-gray-100">
                    <div className="flex gap-2 px-3 py-2.5">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gray-400" aria-hidden />
                      <p className="text-[11px] sm:text-[12px] leading-relaxed text-brand-gray-600">
                        {row.lama}
                      </p>
                    </div>
                    <div className="flex gap-2 bg-brand-success-soft/50 px-3 py-2.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-success" aria-hidden />
                      <p className="text-[11px] sm:text-[12px] leading-relaxed text-brand-gray-900 font-medium">
                        {row.posko}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SEO . Compact numbered cards
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="bg-white sm:mx-auto sm:max-w-3xl sm:rounded-2xl">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
            <p className="mb-1 text-[11px] sm:text-[12px] font-bold uppercase tracking-wide text-brand-red">
              Ditemukan di Google
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-brand-gray-900">
              Kenapa jasa Anda bisa muncul di pencarian
            </h2>
            <p className="mt-2 text-[12px] sm:text-[13px] leading-relaxed text-brand-gray-700">
              Halaman di Posko terbuka, permanen, dan didaftarkan otomatis ke sitemap yang dibaca Google.
            </p>

            <div className="mt-5 space-y-3">
              {SEO_POINTS.map((p, i) => (
                <AnimateOnScroll key={p.judul} delay={i * 80}>
                  <div className="rounded-xl border border-brand-gray-100 bg-brand-gray-50 p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red text-[12px] font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[13px] sm:text-[14px] font-bold text-brand-gray-900">{p.judul}</h3>
                        <p className="mt-1 overflow-x-auto whitespace-nowrap rounded bg-white px-2 py-1 font-mono text-[10px] sm:text-[11px] text-brand-gray-600 ring-1 ring-brand-gray-100">
                          {p.contoh}
                        </p>
                        <p className="mt-1.5 text-[12px] sm:text-[13px] leading-relaxed text-brand-gray-700">
                          {p.isi}
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>

            {/* Batas klaim */}
            <p className="mt-4 flex gap-2 rounded-xl border border-brand-gray-100 bg-brand-gray-50 p-3 text-[11px] sm:text-[12px] leading-relaxed text-brand-gray-600">
              <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gray-400" aria-hidden />
              <span>
                Terindeks bukan jaminan peringkat satu. Yang Posko pastikan: halaman Anda ada, permanen, dan terbaca mesin pencari.
              </span>
            </p>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SETUP LAYANAN . Icon Grid Cards
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
          <p className="mb-1 text-[11px] sm:text-[12px] font-bold uppercase tracking-wide text-brand-red">
            Sekali atur
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-brand-gray-900">
            Berhenti jelaskan harga di tiap chat
          </h2>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {SETUP_POINTS.map((p, i) => (
              <AnimateOnScroll key={p.judul} delay={i * 50}>
                <div className="group rounded-xl border border-brand-gray-100 bg-white p-3.5 sm:p-4 transition-shadow hover:shadow-md hover:border-brand-red/20">
                  <BadgeCheck className="h-5 w-5 text-brand-red mb-2 transition-transform group-hover:scale-110" aria-hidden />
                  <h3 className="text-[12px] sm:text-[13px] font-bold text-brand-gray-900 leading-snug">{p.judul}</h3>
                  <p className="mt-1 text-[11px] sm:text-[12px] leading-relaxed text-brand-gray-600">{p.isi}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          ALUR TRANSAKSI . Horizontal stepper
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="bg-white sm:mx-auto sm:max-w-3xl sm:rounded-2xl">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
            <p className="mb-1 text-[11px] sm:text-[12px] font-bold uppercase tracking-wide text-brand-red">
              Saat pesanan masuk
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-brand-gray-900">
              Anda kerjakan, urusan uangnya sudah beres
            </h2>
            <p className="mt-2 text-[12px] sm:text-[13px] leading-relaxed text-brand-gray-700">
              Pelanggan membayar ke Posko sebelum Anda berangkat.
            </p>

            {/* Horizontal scroll stepper on mobile */}
            <div className="mt-5 -mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0 sm:overflow-visible">
              <div className="flex gap-2.5 sm:grid sm:grid-cols-5 sm:gap-3 min-w-max sm:min-w-0">
                {FLOW_STEPS.map((s, i) => {
                  const Icon = FLOW_ICONS[i] ?? Zap;
                  return (
                    <AnimateOnScroll key={s.judul} delay={i * 80}>
                      <div className="relative flex w-[130px] sm:w-auto flex-col items-center text-center rounded-xl border border-brand-gray-100 bg-brand-gray-50 p-3 sm:p-4">
                        {/* Step number */}
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-red text-white text-[13px] font-bold mb-2">
                          <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="text-[12px] sm:text-[13px] font-bold text-brand-gray-900 leading-tight">{s.judul}</h3>
                        <p className="mt-1 text-[10px] sm:text-[11px] leading-snug text-brand-gray-600">{s.isi}</p>
                        {/* Connector arrow (not on last) */}
                        {i < FLOW_STEPS.length - 1 && (
                          <ChevronRight className="absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray-300 hidden sm:block" />
                        )}
                      </div>
                    </AnimateOnScroll>
                  );
                })}
              </div>
            </div>

            {/* Perlindungan sengketa */}
            <div className="mt-5 flex gap-2.5 rounded-xl border border-brand-info-light bg-brand-info-soft p-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-info-dark" aria-hidden />
              <p className="text-[11px] sm:text-[12px] leading-relaxed text-brand-gray-900">
                Ada selisih paham? Pesanan bisa dibawa ke jalur sengketa. Dana ditahan sampai tim Posko memutuskan - perlindungan untuk kedua pihak.
              </p>
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          BIAYA . Prominent numbers
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section id="biaya" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
          <p className="mb-1 text-[11px] sm:text-[12px] font-bold uppercase tracking-wide text-brand-red">
            Transparan
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-brand-gray-900">
            Tidak ada ruginya bergabung
          </h2>
          <p className="mt-2 text-[12px] sm:text-[13px] text-brand-gray-700">
            Kami baru menerima bagian ketika Anda menerima bagian.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-brand-gray-100 bg-white">
            <dl>
              {barisBiaya.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center justify-between gap-3 border-b border-brand-gray-100 px-4 py-3 last:border-b-0"
                >
                  <dt className="text-[12px] sm:text-[13px] text-brand-gray-700">{b.label}</dt>
                  <dd
                    className={`shrink-0 font-bold ${b.gratisFlag
                        ? 'text-[15px] sm:text-[16px] text-brand-success'
                        : 'text-[13px] sm:text-[14px] text-brand-gray-900'
                      }`}
                  >
                    {b.nilai}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="bg-brand-success-soft px-4 py-3 text-[12px] sm:text-[13px] font-semibold leading-relaxed text-brand-success-dark">
              Tidak ada pesanan = tidak ada biaya. Komisi {komisi} hanya dari pesanan yang selesai.
            </p>
          </div>

          {/* Syarat masuk */}
          <p className="mt-3 flex gap-2 rounded-xl border border-brand-warning-light bg-brand-warning-light/40 p-3 text-[11px] sm:text-[12px] leading-relaxed text-brand-gray-900">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-brand-amber-dark" aria-hidden />
            <span>
              Harga layanan minimal {hargaMin}. Bila di bawah itu, gabungkan jadi satu paket.
            </span>
          </p>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          KEUNGGULAN PENDAFTAR AWAL . Gradient highlight cards
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="bg-white sm:mx-auto sm:max-w-3xl sm:rounded-2xl">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
            <p className="mb-1 text-[11px] sm:text-[12px] font-bold uppercase tracking-wide text-brand-red">
              Mitra pendaftar awal
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-brand-gray-900">
              Keuntungan yang hanya berlaku sekarang
            </h2>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
              {EARLY_ADVANTAGES.map((a, i) => (
                <AnimateOnScroll key={a.judul} delay={i * 80}>
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-red/[0.04] to-brand-red/[0.08] p-4 transition-all hover:from-brand-red/[0.06] hover:to-brand-red/[0.12]">
                    <Sparkles className="h-5 w-5 text-brand-red mb-2 transition-transform group-hover:rotate-12" aria-hidden />
                    <h3 className="text-[13px] sm:text-[14px] font-bold text-brand-gray-900">{a.judul}</h3>
                    <p className="mt-1 text-[11px] sm:text-[12px] leading-relaxed text-brand-gray-700">{a.isi}</p>
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
        <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
          <p className="mb-1 text-[11px] sm:text-[12px] font-bold uppercase tracking-wide text-brand-red">
            Cara mendaftar
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-brand-gray-900">
            Siapkan 5 hal ini, sisanya kami pandu
          </h2>

          <ul className="mt-5 space-y-2">
            {PREP_ITEMS.map((item, i) => (
              <AnimateOnScroll key={item} delay={i * 50}>
                <li className="flex items-start gap-2.5 rounded-xl border border-brand-gray-100 bg-white px-3.5 py-2.5 text-[12px] sm:text-[13px] leading-relaxed text-brand-gray-900 transition-colors hover:border-brand-red/20">
                  <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" aria-hidden />
                  {item}
                </li>
              </AnimateOnScroll>
            ))}
          </ul>
          <p className="mt-3 text-[11px] sm:text-[12px] leading-relaxed text-brand-gray-600">
            Setelah dikirim, berkas diperiksa tim Posko. Sambil menunggu, Anda sudah bisa
            menyiapkan etalase layanan dan jadwal kerja.
          </p>
        </section>
      </AnimateOnScroll>

      {/* ── FAQ ── */}
      <AnimateOnScroll>
        <div className="mx-auto w-full max-w-3xl px-4 pb-2">
          <FaqSection items={faq} title="Pertanyaan calon mitra" />
        </div>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          PENUTUP . Bold CTA
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="mx-auto mt-6 w-full max-w-3xl px-4">
          <div className="relative overflow-hidden rounded-2xl bg-brand-gray-900 px-5 py-8 text-center sm:px-8 sm:py-10">
            {/* Decorative */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-red/10" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-brand-red/10" />

            <div className="relative">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Mulai dari satu layanan saja
              </h2>
              <p className="mx-auto mt-2.5 max-w-lg text-[13px] sm:text-sm leading-relaxed text-white/75">
                Pasang satu jasa yang paling sering Anda kerjakan, lihat hasilnya, lalu tambah yang lain.
              </p>
              <CtaDaftar
                position="penutup"
                className="mt-5 !bg-brand-red !text-white hover:!bg-brand-red-dark"
              />
              <p className="mt-3.5 text-[11px] sm:text-[12px] text-white/50">
                Dengan mendaftar, Anda menyetujui{' '}
                <Link href="/terms" className="underline hover:text-white">
                  Syarat &amp; Ketentuan
                </Link>{' '}
                dan{' '}
                <Link href="/privacy" className="underline hover:text-white">
                  Kebijakan Privasi
                </Link>
                .
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-[12px] sm:text-[13px] text-brand-gray-700">
            Sudah jadi mitra?{' '}
            <Link href="/mitra/dashboard" className="font-semibold text-brand-red hover:underline">
              Masuk ke dasbor mitra
              <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </p>
        </section>
      </AnimateOnScroll>
    </div>
  );
}
