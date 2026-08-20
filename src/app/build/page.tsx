import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import AnimateOnScroll from '@/components/ui/animate-on-scroll';
import { getPlatformConfig } from '@/lib/config-server';
import {
  HERO_METRICS,
  INVESTOR_PILLARS,
  MARKETPLACE_FLOW,
  OWNERSHIP_POINTS,
  ROADMAP,
  ROLES,
  TODAY_METRICS,
  TRACTION_AS_OF,
  WHY_NOW,
  contactHref,
  revenueSplit,
} from '@/lib/build-page';
import { BuildCta, TrackBuildView } from './BuildCta';

/**
 * Halaman /build . "Build Posko With Us".
 *
 * SATU halaman untuk empat pembaca: calon founding team, advisor, partner, dan
 * investor. Sengaja tidak dipecah menjadi /careers dan /investors yang berdiri
 * sendiri: isinya belum cukup untuk mengisi dua halaman, dan dua halaman tipis
 * lebih buruk daripada satu halaman padat . keduanya akan saling mengambil
 * bobot pencarian untuk kata kunci yang sama. `/careers` dan `/investors` tetap
 * hidup sebagai redirect ke jangkar di halaman ini (lihat next.config.ts),
 * sehingga alamat yang diketik orang tetap sampai.
 *
 * Server Component penuh: satu-satunya JS yang dikirim adalah pulau kecil di
 * ./BuildCta untuk analytics. Angka komisi diambil dari /config di server .
 * ilustrasi pembagian hasil di Section "Business Model" IKUT berubah bila admin
 * mengubah komisi, tanpa redeploy Amplify.
 *
 * VISUAL: sengaja berbeda dari marketplace utamanya . latar dominan putih
 * (bukan `bg-brand-gray-60` seperti halaman pelanggan), tipografi jauh lebih
 * besar, merah sebagai satu-satunya aksen. Tidak ada ilustrasi startup generik;
 * yang ditampilkan adalah ikon kategori produk yang benar-benar dipakai dan
 * angka traksi yang benar-benar ada.
 *
 * CATATAN RUTE: `RESERVED_ROOT_SEGMENTS` di components/layout/HeaderWrapper.tsx
 * WAJIB memuat "build" . tanpa itu rute ini dikira username mitra dan
 * TopNavbar-nya hilang di mobile. Halaman ini SENGAJA tidak masuk
 * `MOBILE_HIDE_PATHS`: pembacanya datang dari tautan yang dibagikan, tanpa
 * riwayat untuk ditekan "kembali", jadi TopNavbar adalah satu-satunya jalan
 * masuknya ke sisa situs.
 */
export const revalidate = 600;

const SITE = 'https://poskojasa.com';

export const metadata: Metadata = {
  // Tanpa "Posko Jasa": template root sudah menambahkan "| Posko Jasa".
  title: 'Build With Us - Bangun Marketplace Jasa Bersama Posko',
  description:
    'Posko sedang membangun marketplace jasa di Indonesia. Produk sudah live di Semarang dengan 80+ pengguna dan 50+ mitra. Kami mencari founding team, advisor, partner, dan early-stage investor.',
  alternates: { canonical: `${SITE}/build` },
  // `images`, `siteName`, dan `locale` WAJIB diulang: Next MENGGANTI objek
  // openGraph milik root layout, tidak menggabungnya . tanpa ini halaman
  // terkirim tanpa og:image sama sekali. Halaman inilah yang paling sering
  // dibagikan lewat WhatsApp & LinkedIn, tempat pratinjau tanpa gambar
  // praktis tidak diklik.
  openGraph: {
    title: 'Build Posko With Us - Bangun Marketplace Jasa Bersama Posko',
    description:
      'Produk sudah live, pengguna mulai datang. Kami mencari orang yang ingin ikut membangun sejak tahap awal.',
    url: `${SITE}/build`,
    type: 'website',
    locale: 'id_ID',
    siteName: 'Posko Jasa',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Build Posko With Us',
      },
    ],
  },
};

/**
 * Kategori nyata dari katalog Posko, dipakai sebagai bukti visual di Section 2.
 *
 * Ikonnya berkas produk yang sama dengan yang dipakai di halaman kategori .
 * bukan ilustrasi stok. Daftarnya sengaja pendek dan cocok dengan contoh yang
 * disebut di teksnya (teknisi AC, MUA, cleaning, tukang, dekorasi).
 */
const CONTOH_KATEGORI = [
  { label: 'Servis AC', icon: '/icons/air-conditioner.png' },
  { label: 'MUA', icon: '/icons/make-up.png' },
  { label: 'Cleaning', icon: '/icons/janitor.png' },
  { label: 'Tukang', icon: '/icons/handyman.png' },
  { label: 'Dekorasi', icon: '/icons/decor.png' },
];

/** Tempat teks berserak sebelum ada marketplace . disebut apa adanya. */
const TEMPAT_TERSEBAR = ['Google', 'Instagram', 'WhatsApp', 'Facebook', 'Rekomendasi teman'];

export default async function BuildPage() {
  const cfg = await getPlatformConfig();
  const split = revenueSplit(cfg);

  const emailTim = contactHref(cfg, 'Gabung Founding Team Posko');
  const emailInvestor = contactHref(cfg, 'Diskusi Investasi - Posko Jasa');
  const emailDeck = contactHref(cfg, 'Request Investor Deck - Posko Jasa');

  return (
    <div className="page-h bg-white">
      <TrackBuildView />

      {/* ════════════════════════════════════════════════════════════════
          HERO . tipografi besar, latar putih, merah sebagai satu-satunya aksen
          ════════════════════════════════════════════════════════════════ */}
      <header className="border-b border-brand-gray-100">
        <div className="mx-auto w-full max-w-5xl px-4 pt-10 pb-12 sm:pt-20 sm:pb-20">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-brand-gray-900 sm:text-[12px]">
            Posko
            <span className="h-px w-6 bg-brand-red" aria-hidden />
            <span className="text-brand-red">Build With Us</span>
          </p>

          <h1 className="mt-6 max-w-4xl text-[34px] font-black leading-[1.05] tracking-tight text-brand-gray-900 sm:text-[56px] lg:text-[68px]">
            Bangun Masa Depan Marketplace Jasa{' '}
            <span className="text-brand-red">Bersama Posko</span>
          </h1>

          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-brand-gray-700 sm:text-[18px]">
            Posko sedang membangun tempat di mana mencari dan memesan jasa bisa semudah belanja
            online. Produk kami sudah live, pengguna mulai datang, dan sekarang kami mencari
            orang-orang yang ingin ikut membangunnya sejak tahap awal.
          </p>

          {/* ── Angka nyata sebagai social proof ── */}
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-brand-gray-100 bg-brand-gray-100 sm:mt-12 sm:grid-cols-4">
            {HERO_METRICS.map((m) => (
              <div key={m.label} className="bg-white px-4 py-5 sm:px-6 sm:py-7">
                <p className="text-[24px] font-black leading-none tracking-tight text-brand-gray-900 sm:text-[32px]">
                  {m.value}
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-gray-450 sm:text-[11px]">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-brand-gray-450">
            Angka per {TRACTION_AS_OF} - poskojasa.com
          </p>

          {/* ── Dua CTA besar ── */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <BuildCta href="#roles" position="hero" intent="team" variant="primary">
              Gabung Founding Team
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </BuildCta>
            <BuildCta href="#investors" position="hero" intent="investor" variant="outline">
              Untuk Investor
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </BuildCta>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 2 . Kenapa Posko dibangun
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="border-b border-brand-gray-100 bg-brand-gray-60">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
              Kenapa Posko Dibangun
            </p>
            <h2 className="mt-4 max-w-3xl text-[28px] font-black leading-[1.1] tracking-tight text-brand-gray-900 sm:text-[44px]">
              Barang sudah punya marketplace. Jasa belum.
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-brand-gray-700 sm:text-[17px]">
              Saat seseorang butuh teknisi AC, MUA, cleaning service, tukang, dekorasi, atau
              layanan lain, proses pencariannya masih tersebar di Google, Instagram, WhatsApp,
              Facebook, dan rekomendasi teman. Posko ingin menyatukannya dalam satu marketplace.
            </p>

            {/* ── Yang tersebar hari ini ── */}
            <div className="mt-8 flex flex-wrap gap-2">
              {TEMPAT_TERSEBAR.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-dashed border-brand-gray-200 px-3 py-1.5 text-[12px] font-medium text-brand-gray-450"
                >
                  {t}
                </span>
              ))}
            </div>

            {/* ── Kategori nyata dari katalog Posko ── */}
            <div className="mt-6 flex flex-wrap gap-2">
              {CONTOH_KATEGORI.map((k) => (
                <span
                  key={k.label}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-gray-100 bg-white px-3 py-1.5 text-[12px] font-bold text-brand-gray-900 shadow-sm"
                >
                  <Image src={k.icon} alt="" width={18} height={18} className="h-[18px] w-[18px]" />
                  {k.label}
                </span>
              ))}
            </div>

            {/* ── Alur marketplace: produknya terbaca dalam 5 detik ── */}
            <div className="mt-10 rounded-2xl border border-brand-gray-100 bg-white p-5 sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray-450">
                Satu alur, satu tempat
              </p>
              <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3">
                {MARKETPLACE_FLOW.map((step, i) => (
                  <li key={step} className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-3 py-2 text-[12px] font-bold sm:text-[14px] ${
                        i === 1
                          ? 'bg-brand-red text-white'
                          : 'bg-brand-gray-60 text-brand-gray-900'
                      }`}
                    >
                      {step}
                    </span>
                    {i < MARKETPLACE_FLOW.length - 1 && (
                      <ArrowRight
                        className="h-3.5 w-3.5 shrink-0 text-brand-gray-300"
                        aria-hidden
                      />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 3 . Posko hari ini
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="border-b border-brand-gray-100">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
                  Posko Hari Ini
                </p>
                <h2 className="mt-4 text-[28px] font-black leading-[1.1] tracking-tight text-brand-gray-900 sm:text-[44px]">
                  Ini bukan proyek PowerPoint.
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-gray-100 bg-white px-3 py-1.5 text-[11px] font-bold text-brand-gray-700">
                <span className="h-2 w-2 rounded-full bg-brand-success" aria-hidden />
                Live - {TRACTION_AS_OF}
              </span>
            </div>

            {/* ── Dasbor metrik ── */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-brand-gray-100">
              <dl className="grid grid-cols-1 gap-px bg-brand-gray-100 sm:grid-cols-2 lg:grid-cols-3">
                {TODAY_METRICS.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-baseline justify-between gap-4 bg-white px-5 py-5 sm:flex-col sm:items-start sm:gap-2 sm:px-6 sm:py-7"
                  >
                    <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gray-450">
                      {m.label}
                    </dt>
                    <dd className="text-right sm:text-left">
                      <span className="block text-[22px] font-black leading-none tracking-tight text-brand-gray-900 sm:text-[30px]">
                        {m.value}
                      </span>
                      {m.note && (
                        <span className="mt-1 block text-[12px] text-brand-gray-450">{m.note}</span>
                      )}
                    </dd>
                  </div>
                ))}
                {/* Sel penutup: mengisi kolom terakhir supaya kisi hairline-nya
                    tidak berhenti menggantung di tengah baris. */}
                <div className="hidden bg-white px-6 py-7 lg:block">
                  <p className="text-[13px] leading-relaxed text-brand-gray-700">
                    Semua angka di atas adalah pengguna dan mitra yang benar-benar terdaftar, bukan
                    proyeksi.
                  </p>
                </div>
              </dl>
            </div>

            <p className="mt-8 max-w-2xl text-[16px] font-semibold leading-relaxed text-brand-gray-900 sm:text-[20px]">
              Kami masih sangat awal. Justru itu kesempatan untuk ikut membentuk Posko sebelum
              semuanya menjadi besar.
            </p>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 4 . Kami mencari siapa
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section id="roles" className="scroll-mt-20 border-b border-brand-gray-100 bg-brand-gray-60">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
              Founding Team
            </p>
            <h2 className="mt-4 text-[28px] font-black leading-[1.1] tracking-tight text-brand-gray-900 sm:text-[44px]">
              Kami mencari siapa?
            </h2>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {ROLES.map((role, i) => (
                <AnimateOnScroll key={role.slug} delay={i * 70}>
                  <Link
                    href={`/build/${role.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-brand-gray-100 bg-white p-6 transition-colors hover:border-brand-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red sm:p-8"
                  >
                    <h3 className="text-[20px] font-black tracking-tight text-brand-gray-900 sm:text-[24px]">
                      {role.title}
                    </h3>
                    <p className="mt-3 text-[14px] font-semibold text-brand-gray-900">
                      {role.headline}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-brand-gray-700">
                      {role.summary}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-red">
                      Explore Role
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden
                      />
                    </span>
                  </Link>
                </AnimateOnScroll>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-brand-gray-200 bg-white p-6">
              <p className="text-[14px] leading-relaxed text-brand-gray-700">
                <span className="font-bold text-brand-gray-900">
                  Tidak menemukan posisi yang cocok?
                </span>{' '}
                Jika kamu merasa bisa memberi dampak besar untuk Posko, tetap hubungi kami.
              </p>
              <BuildCta
                href={emailTim}
                position="roles-terbuka"
                intent="team"
                variant="ghost"
                className="mt-4 !px-0 !py-0 !text-brand-red hover:!bg-white hover:underline"
              >
                Kirim perkenalanmu
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </BuildCta>
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 5 . Bukan sekadar mencari pekerjaan
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="bg-brand-gray-900">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <h2 className="max-w-3xl text-[28px] font-black leading-[1.1] tracking-tight text-white sm:text-[44px]">
              Bukan sekadar mencari pekerjaan.
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/70 sm:text-[17px]">
              Kami mencari orang yang ingin membangun sesuatu sejak awal. Di tahap Posko sekarang,
              kamu tidak hanya menjalankan job description. Kamu ikut menentukan produk, strategi,
              budaya, dan arah perusahaan.
            </p>

            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {OWNERSHIP_POINTS.map((p) => (
                <div key={p.title} className="bg-brand-gray-900 px-6 py-7">
                  <h3 className="text-[15px] font-black tracking-tight text-white">{p.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/70">{p.body}</p>
                </div>
              ))}
            </div>

            <p className="mt-8 max-w-2xl text-[13px] leading-relaxed text-white/60">
              Soal kompensasi kami tidak berbasa-basi: keadaan Posko hari ini dijelaskan apa adanya
              di halaman tiap peran, sebelum kamu memutuskan untuk mengobrol.
            </p>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 6 . Investor . nada sengaja berbeda
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section
          id="investors"
          className="scroll-mt-20 border-b border-brand-gray-100"
        >
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-blue">
              For Investors
            </p>
            <h2 className="mt-4 max-w-3xl text-[28px] font-black leading-[1.1] tracking-tight text-brand-gray-900 sm:text-[44px]">
              Investing in the service economy.
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-brand-gray-700 sm:text-[17px]">
              Posko sedang membangun marketplace untuk salah satu pasar yang sangat besar tetapi
              masih sangat terfragmentasi: jasa lokal.
            </p>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {INVESTOR_PILLARS.map((p, i) => (
                <AnimateOnScroll key={p.title} delay={i * 80}>
                  <div className="relative flex h-full flex-col rounded-2xl border border-brand-gray-100 bg-white p-6 sm:p-8">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gray-450">
                      {`0${i + 1}`}
                    </span>
                    <h3 className="mt-3 text-[19px] font-black tracking-tight text-brand-gray-900 sm:text-[22px]">
                      {p.title}
                    </h3>
                    <p className="mt-3 text-[13px] leading-relaxed text-brand-gray-700">{p.body}</p>
                    {i < INVESTOR_PILLARS.length - 1 && (
                      // Panah penghubung: hanya di desktop. Di mobile kartunya
                      // bertumpuk vertikal dan panah ke kanan justru menyesatkan.
                      <ArrowRight
                        className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-brand-gray-300 lg:block"
                        aria-hidden
                      />
                    )}
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 7 . Why now
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="border-b border-brand-gray-100 bg-brand-gray-60">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
              Why Now
            </p>
            <h2 className="mt-4 max-w-3xl text-[28px] font-black leading-[1.1] tracking-tight text-brand-gray-900 sm:text-[44px]">
              Kenapa sekarang?
            </h2>

            <ol className="mt-8 divide-y divide-brand-gray-100 border-y border-brand-gray-100">
              {WHY_NOW.map((w, i) => (
                <li key={w.title} className="flex flex-col gap-2 py-6 sm:flex-row sm:gap-8 sm:py-8">
                  <span className="shrink-0 text-[13px] font-black tracking-[0.1em] text-brand-red sm:w-20 sm:text-[15px]">
                    {`0${i + 1}`}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-black leading-snug tracking-tight text-brand-gray-900 sm:text-[22px]">
                      {w.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-brand-gray-700">
                      {w.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-10 max-w-3xl text-[22px] font-black leading-[1.15] tracking-tight text-brand-gray-900 sm:text-[36px]">
              Posko membawa marketplace behaviour ke industri jasa.
            </p>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 8 . Business model
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="border-b border-brand-gray-100">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
              Business Model
            </p>
            <h2 className="mt-4 text-[28px] font-black leading-[1.1] tracking-tight text-brand-gray-900 sm:text-[44px]">
              Posko dibayar saat mitra dibayar.
            </h2>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              {/* Nilai pesanan */}
              <div className="rounded-2xl border border-brand-gray-100 bg-white p-6 sm:p-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gray-450">
                  Order
                </p>
                <p className="mt-2 text-[30px] font-black leading-none tracking-tight text-brand-gray-900 sm:text-[40px]">
                  {split.order}
                </p>
              </div>

              <div className="flex justify-center">
                <ArrowRight
                  className="h-6 w-6 rotate-90 text-brand-gray-300 lg:rotate-0"
                  aria-hidden
                />
              </div>

              {/* Pembagiannya */}
              <div className="grid gap-px overflow-hidden rounded-2xl border border-brand-gray-100 bg-brand-gray-100 sm:grid-cols-2">
                <div className="bg-white p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gray-450">
                    Mitra
                  </p>
                  <p className="mt-2 text-[24px] font-black leading-none tracking-tight text-brand-gray-900 sm:text-[30px]">
                    {split.partner}
                  </p>
                </div>
                <div className="bg-brand-red p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                    Posko
                  </p>
                  <p className="mt-2 text-[24px] font-black leading-none tracking-tight text-white sm:text-[30px]">
                    {split.posko}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[20px] font-black tracking-tight text-brand-gray-900 sm:text-[26px]">
                {split.rate} success fee
              </span>
              <span className="rounded-full border border-brand-gray-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-gray-450">
                Current business model
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-brand-gray-700">
              Posko mendapatkan komisi hanya ketika transaksi berhasil. Tidak ada biaya
              pendaftaran, langganan, maupun iklan bagi mitra.
            </p>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 9 . Roadmap
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="border-b border-brand-gray-100 bg-brand-gray-60">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
              Roadmap
            </p>
            <h2 className="mt-4 text-[28px] font-black leading-[1.1] tracking-tight text-brand-gray-900 sm:text-[44px]">
              Ke mana Posko dibawa.
            </h2>

            <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-brand-gray-100 bg-brand-gray-100 sm:grid-cols-2 lg:grid-cols-4">
              {ROADMAP.map((s, i) => (
                <div key={s.tag} className="bg-white px-6 py-7">
                  <span
                    className={`inline-block rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                      i === 0 ? 'bg-brand-red text-white' : 'bg-brand-gray-60 text-brand-gray-450'
                    }`}
                  >
                    {s.tag}
                  </span>
                  <p className="mt-4 text-[15px] font-bold leading-snug text-brand-gray-900 sm:text-[17px]">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 10 . What we're looking for
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="border-b border-brand-gray-100">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-blue">
              What We&apos;re Looking For
            </p>
            <h2 className="mt-4 max-w-3xl text-[28px] font-black leading-[1.1] tracking-tight text-brand-gray-900 sm:text-[44px]">
              We are open to conversations.
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-brand-gray-700 sm:text-[17px]">
              Saat ini Posko terbuka untuk berdiskusi dengan angel investor, operator, advisor, dan
              early-stage investor yang memahami marketplace, consumer technology, atau local
              services.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <BuildCta href={emailInvestor} position="investor" intent="investor" variant="dark">
                Talk With The Founder
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </BuildCta>
              <BuildCta href={emailDeck} position="investor-deck" intent="investor" variant="outline">
                Request Investor Deck
                <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
              </BuildCta>
            </div>

            <ul className="mt-8 grid gap-2 text-[13px] text-brand-gray-700 sm:grid-cols-2">
              {[
                'Deck dikirim langsung, bukan tautan terbuka untuk umum.',
                'Ukuran pendanaan belum ditentukan . kami mulai dari percakapan.',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ════════════════════════════════════════════════════════════════
          PENUTUP
          ════════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="bg-white">
          <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
            <h2 className="max-w-3xl text-[30px] font-black leading-[1.08] tracking-tight text-brand-gray-900 sm:text-[52px]">
              Posko masih di awal. Dan itu bagian yang{' '}
              <span className="text-brand-red">menarik</span>.
            </h2>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-brand-gray-700 sm:text-[18px]">
              Produk sudah dibangun. Marketplace sudah live. User dan mitra pertama sudah bergabung.
              Sekarang kami mencari orang yang ingin ikut menentukan apa yang terjadi selanjutnya.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <BuildCta href="#roles" position="penutup" intent="team" variant="primary">
                Join The Team
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </BuildCta>
              <BuildCta
                href={emailInvestor}
                position="penutup"
                intent="investor"
                variant="outline"
              >
                Invest in Posko
                <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
              </BuildCta>
            </div>

            <p className="mt-10 text-[13px] text-brand-gray-450">
              Ingin melihat produknya lebih dulu?{' '}
              <Link
                href="/services"
                className="font-semibold text-brand-gray-900 underline underline-offset-2 hover:text-brand-red"
              >
                Jelajahi layanan di Posko
              </Link>{' '}
              atau{' '}
              <Link
                href="/jadi-mitra"
                className="font-semibold text-brand-gray-900 underline underline-offset-2 hover:text-brand-red"
              >
                daftar sebagai mitra
              </Link>
              .
            </p>
          </div>
        </section>
      </AnimateOnScroll>
    </div>
  );
}
