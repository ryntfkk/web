import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
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
  PREP_ITEMS,
  SEO_POINTS,
  SETUP_POINTS,
  partnerFaq,
} from '@/lib/partner-landing';
import { CtaDaftar, TrackLandingView } from './Cta';

/**
 * Halaman akuisisi mitra.
 *
 * SENGAJA di root (/jadi-mitra), BUKAN di bawah /mitra. Seluruh area /mitra
 * ber-`robots: noindex` (mitra/layout.tsx), di-disallow robots.txt, dan
 * dipagari useRequireAuth — pengunjung anonim beserta Googlebot hanya akan
 * menerima halaman kosong di sana. Halaman yang tugasnya menjaring orang dari
 * hasil pencarian tidak bisa berdiri di belakang ketiga pagar itu.
 *
 * Server Component penuh: satu-satunya JS yang dikirim adalah pulau kecil di
 * ./Cta untuk analytics. Angka biaya diambil dari /config di server sehingga
 * perubahan admin terbawa tanpa redeploy Amplify, dan tetap ada di HTML awal.
 *
 * CATATAN: bila menambah rute root baru seperti ini, `RESERVED_ROOT_SEGMENTS`
 * di components/layout/HeaderWrapper.tsx WAJIB ikut diperbarui — kalau tidak,
 * rutenya dikira username mitra dan header hilang di mobile.
 */
export const revalidate = 600;

const SITE = 'https://poskojasa.com';

export const metadata: Metadata = {
  // Tanpa "Posko Jasa": template root sudah menambahkan "| Posko Jasa". Menulisnya
  // di sini membuat merek tercetak dua kali dan judulnya terpotong di hasil
  // pencarian. Judul OG di bawah boleh memuatnya — OG tidak kena template.
  title: 'Jadi Mitra — Pasang Jasa Gratis, Ditemukan di Google',
  description:
    'Daftar jadi mitra Posko Jasa tanpa biaya pendaftaran, langganan, atau iklan. Setiap layanan Anda mendapat halaman sendiri yang bisa ditemukan lewat pencarian Google, lengkap dengan harga, jadwal, dan pembayaran yang terjamin.',
  alternates: { canonical: `${SITE}/jadi-mitra` },
  // `images`, `siteName`, dan `locale` WAJIB diulang di sini. Next MENGGANTI
  // objek openGraph milik root layout, tidak menggabungnya — tanpa ini halaman
  // terkirim tanpa og:image sama sekali. Justru halaman inilah yang paling
  // sering dibagikan lewat WhatsApp, tempat pratinjau tanpa gambar praktis
  // tidak diklik. Aturan yang sama pernah menjatuhkan /kategori & /jasa.
  openGraph: {
    title: 'Jadi Mitra Posko Jasa — Pasang Jasa Gratis, Ditemukan di Google',
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
        alt: 'Jadi mitra Posko Jasa — pasang jasa gratis',
      },
    ],
  },
};

/** Pembungkus satu bagian — menjaga lebar baca & jarak antarbagian seragam. */
function Section({
  id,
  eyebrow,
  judul,
  intro,
  children,
  className = '',
}: {
  id?: string;
  eyebrow?: string;
  judul: string;
  intro?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 ${className}`}>
      {eyebrow && (
        <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-brand-red">{eyebrow}</p>
      )}
      <h2 className="text-xl font-bold leading-snug text-brand-gray-900 sm:text-2xl">{judul}</h2>
      {intro && <p className="mt-2.5 text-sm leading-relaxed text-brand-gray-700">{intro}</p>}
      <div className="mt-5 sm:mt-6">{children}</div>
    </section>
  );
}

export default async function JadiMitraPage() {
  const cfg = await getPlatformConfig();
  const faq = partnerFaq(cfg);

  const komisi = formatFeeRate(cfg.platform_fee_rate);
  const biayaTarik = formatRupiah(cfg.withdrawal_fee);
  const hargaMin = formatRupiah(cfg.min_transaction);

  // Angka nol ditulis lewat formatRupiah juga, bukan literal "Rp 0" — supaya
  // format ribuan/spasi persis sama dengan baris berbayar di bawahnya.
  const gratis = formatRupiah(0);

  const barisBiaya = [
    { label: 'Biaya pendaftaran', nilai: gratis, gratisFlag: true },
    { label: 'Biaya langganan bulanan', nilai: gratis, gratisFlag: true },
    { label: 'Biaya iklan & promosi', nilai: gratis, gratisFlag: true },
    { label: 'Komisi per pesanan selesai', nilai: komisi, gratisFlag: false },
    { label: 'Biaya penarikan saldo ke rekening', nilai: biayaTarik, gratisFlag: false },
  ];

  return (
    <div className="page-h bg-brand-gray-60 pb-16">
      <JsonLd data={faqJsonLd(faq)} />
      <TrackLandingView />

      {/* ── Hero ── */}
      <header className="bg-gradient-to-b from-brand-red to-brand-red-dark text-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Pendaftaran mitra sedang dibuka
          </p>
          <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl">
            Pasang jasa Anda di Posko — gratis, dan bisa ditemukan di Google
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/90 sm:text-base">
            Postingan di grup dan marketplace media sosial tenggelam dalam hitungan jam, dan
            praktis tidak muncul di hasil pencarian. Di Posko, tiap layanan Anda punya halaman
            sendiri yang permanen dan terbaca mesin pencari — bekerja terus tanpa perlu repost.
          </p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {['Tanpa biaya pendaftaran', 'Tanpa langganan', 'Bayar hanya saat pesanan selesai'].map(
              (t) => (
                <li
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium"
                >
                  <Check className="h-3.5 w-3.5 shrink-0" /> {t}
                </li>
              ),
            )}
          </ul>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <CtaDaftar
              position="hero"
              className="!bg-white !text-brand-red hover:!bg-white/90 shadow-sm"
            />
            <Link
              href="#biaya"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Lihat rincian biaya
            </Link>
          </div>
        </div>
      </header>

      {/* ── Perbandingan dengan cara lama ── */}
      <Section
        eyebrow="Bedanya di mana"
        judul="Yang berubah setelah jasa Anda punya halaman sendiri"
        intro="Bukan sekadar pindah tempat memasang iklan. Enam hal ini yang selama ini memakan waktu Anda tanpa menghasilkan."
      >
        <div className="space-y-3">
          {COMPARE_ROWS.map((row) => (
            <div
              key={row.aspek}
              className="overflow-hidden rounded-xl border border-brand-gray-100 bg-white"
            >
              <p className="border-b border-brand-gray-100 bg-brand-gray-50 px-4 py-2.5 text-[13px] font-bold text-brand-gray-900">
                {row.aspek}
              </p>
              <div className="divide-y divide-brand-gray-100 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="flex gap-2.5 px-4 py-3">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-brand-gray-400" aria-hidden />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-gray-400">
                      Grup &amp; marketplace medsos
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-brand-gray-700">{row.lama}</p>
                  </div>
                </div>
                <div className="flex gap-2.5 bg-brand-success-soft/60 px-4 py-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-success" aria-hidden />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-success-dark">
                      Di Posko
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-brand-gray-900">{row.posko}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── SEO: alasan utama pindah ── */}
      <Section
        eyebrow="Ditemukan di Google"
        judul="Kenapa jasa Anda bisa muncul di pencarian"
        intro="Postingan di media sosial umumnya perlu login untuk dilihat, jadi mesin pencari tidak bisa membacanya. Halaman di Posko terbuka, permanen, dan didaftarkan otomatis ke sitemap yang dibaca Google."
        className="bg-white sm:rounded-2xl"
      >
        <ol className="space-y-3">
          {SEO_POINTS.map((p, i) => (
            <li
              key={p.judul}
              className="rounded-xl border border-brand-gray-100 bg-brand-gray-50 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-red text-[13px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-brand-gray-900">{p.judul}</h3>
                  <p className="mt-1.5 overflow-x-auto whitespace-nowrap rounded bg-white px-2.5 py-1.5 font-mono text-[11.5px] text-brand-gray-700 ring-1 ring-brand-gray-100">
                    {p.contoh}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-brand-gray-700">{p.isi}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Batas klaim ditulis terbuka. Menjanjikan peringkat satu adalah janji
            yang tidak bisa ditepati siapa pun, dan mitra yang merasa dijanjikan
            itu akan kecewa tepat saat ia mulai percaya. */}
        <p className="mt-4 flex gap-2 rounded-xl border border-brand-gray-100 bg-brand-gray-50 p-3.5 text-[12.5px] leading-relaxed text-brand-gray-700">
          <Search className="mt-0.5 h-4 w-4 shrink-0 text-brand-gray-400" aria-hidden />
          <span>
            Perlu jujur: terindeks bukan jaminan peringkat satu, dan tidak ada yang bisa
            menjanjikan itu. Yang Posko pastikan adalah halaman Anda ada, permanen, dan terbaca
            mesin pencari — tiga hal yang tidak dimiliki sebuah postingan di grup.
          </span>
        </p>
      </Section>

      {/* ── Setup layanan ── */}
      <Section
        eyebrow="Sekali atur"
        judul="Berhenti menjelaskan harga yang sama di tiap chat"
        intro="Hal-hal yang tidak muat di satu postingan, tapi menentukan apakah pekerjaan berjalan lancar atau berakhir jadi perdebatan."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {SETUP_POINTS.map((p) => (
            <div key={p.judul} className="rounded-xl border border-brand-gray-100 bg-white p-4">
              <h3 className="flex items-start gap-2 text-[14px] font-bold text-brand-gray-900">
                <BadgeCheck className="mt-px h-4 w-4 shrink-0 text-brand-red" aria-hidden />
                {p.judul}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-brand-gray-700">{p.isi}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Alur transaksi ── */}
      <Section
        eyebrow="Saat pesanan masuk"
        judul="Anda tinggal kerjakan, urusan uangnya sudah beres"
        intro="Pelanggan membayar ke Posko sebelum Anda berangkat. Tidak ada lagi pekerjaan selesai yang pembayarannya menghilang."
        className="bg-white sm:rounded-2xl"
      >
        <ol className="relative space-y-4 border-l border-brand-gray-100 pl-6">
          {FLOW_STEPS.map((s, i) => (
            <li key={s.judul} className="relative">
              {/* -left-9 = pl-6 (24px) + separuh lebar lingkaran (12px), supaya
                  titiknya duduk tepat di atas garis, bukan meleset ke kanan. */}
              <span className="absolute -left-9 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-red text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <h3 className="text-[14px] font-bold text-brand-gray-900">{s.judul}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-brand-gray-700">{s.isi}</p>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex gap-2.5 rounded-xl border border-brand-info-light bg-brand-info-soft p-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-info-dark" aria-hidden />
          <p className="text-[12.5px] leading-relaxed text-brand-gray-900">
            Bila terjadi selisih paham, pesanan bisa dibawa ke jalur sengketa dan dananya ditahan
            sampai tim Posko memutuskan — perlindungan yang berlaku untuk kedua belah pihak, bukan
            hanya pelanggan.
          </p>
        </div>
      </Section>

      {/* ── Biaya ── */}
      <Section
        id="biaya"
        eyebrow="Transparan"
        judul="Tidak ada ruginya bergabung"
        intro="Posko tidak menagih apa pun di depan. Kami baru menerima bagian ketika Anda menerima bagian."
      >
        <div className="overflow-hidden rounded-xl border border-brand-gray-100 bg-white">
          <dl>
            {barisBiaya.map((b) => (
              <div
                key={b.label}
                className="flex items-center justify-between gap-3 border-b border-brand-gray-100 px-4 py-3 last:border-b-0"
              >
                <dt className="text-[13px] text-brand-gray-700">{b.label}</dt>
                <dd
                  className={`shrink-0 text-[14px] font-bold ${
                    b.gratisFlag ? 'text-brand-success' : 'text-brand-gray-900'
                  }`}
                >
                  {b.nilai}
                </dd>
              </div>
            ))}
          </dl>
          <p className="bg-brand-success-soft px-4 py-3.5 text-[13px] font-semibold leading-relaxed text-brand-success-dark">
            Tidak ada pesanan berarti tidak ada biaya sama sekali. Komisi {komisi} hanya dipotong
            dari pesanan yang benar-benar selesai.
          </p>
        </div>

        {/* Syarat masuk yang selama ini baru ketahuan setelah mitra mengisi form
            layanan. Lebih baik disampaikan sekarang daripada jadi pendaftar yang
            kecewa di langkah terakhir. */}
        <p className="mt-3 flex gap-2 rounded-xl border border-brand-warning-light bg-brand-warning-light/40 p-3.5 text-[12.5px] leading-relaxed text-brand-gray-900">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-brand-amber-dark" aria-hidden />
          <span>
            Satu hal yang perlu diketahui sejak awal: harga layanan minimal {hargaMin}. Bila jasa
            Anda biasanya di bawah itu, gabungkan jadi satu paket — misalnya beberapa unit
            sekaligus atau satu kali kunjungan penuh.
          </span>
        </p>
      </Section>

      {/* ── Keunggulan pendaftar awal ── */}
      <Section
        eyebrow="Mitra pendaftar awal"
        judul="Keuntungan yang hanya berlaku sekarang"
        intro="Bukan promo yang bisa dicabut, melainkan konsekuensi dari masih sedikitnya mitra di tiap kota."
        className="bg-white sm:rounded-2xl"
      >
        <div className="space-y-3">
          {EARLY_ADVANTAGES.map((a) => (
            <div key={a.judul} className="flex gap-3 rounded-xl bg-brand-gray-50 p-4">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" aria-hidden />
              <div>
                <h3 className="text-[14px] font-bold text-brand-gray-900">{a.judul}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-brand-gray-700">{a.isi}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Persiapan & langkah daftar ── */}
      <Section
        eyebrow="Cara mendaftar"
        judul="Siapkan lima hal ini, sisanya kami pandu"
        intro="Pendaftaran dilakukan bertahap dan bisa dilanjutkan kapan saja. Perorangan maupun badan usaha sama-sama diterima."
      >
        <ul className="space-y-2.5">
          {PREP_ITEMS.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 rounded-xl border border-brand-gray-100 bg-white px-4 py-3 text-[13px] leading-relaxed text-brand-gray-900"
            >
              <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12.5px] leading-relaxed text-brand-gray-700">
          Setelah dikirim, berkas Anda diperiksa tim Posko sebelum layanan tampil ke pelanggan.
          Sambil menunggu, Anda sudah bisa menyiapkan etalase layanan dan jadwal kerja.
        </p>
      </Section>

      {/* ── FAQ ── */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-2">
        <FaqSection items={faq} title="Pertanyaan calon mitra" />
      </div>

      {/* ── Penutup ── */}
      <section className="mx-auto mt-8 w-full max-w-3xl px-4">
        <div className="rounded-2xl bg-brand-gray-900 px-5 py-8 text-center sm:px-8 sm:py-10">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Mulai dari satu layanan saja
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-sm leading-relaxed text-white/80">
            Tidak perlu langsung memasang semuanya. Pasang satu jasa yang paling sering Anda
            kerjakan, lihat sendiri hasilnya, lalu tambah yang lain.
          </p>
          <CtaDaftar
            position="penutup"
            className="mt-6 !bg-brand-red !text-white hover:!bg-brand-red-dark"
          />
          <p className="mt-4 text-[12px] text-white/60">
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

        <p className="mt-6 text-center text-[13px] text-brand-gray-700">
          Sudah jadi mitra?{' '}
          <Link href="/mitra/dashboard" className="font-semibold text-brand-red hover:underline">
            Masuk ke dasbor mitra
            <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </p>
      </section>
    </div>
  );
}
