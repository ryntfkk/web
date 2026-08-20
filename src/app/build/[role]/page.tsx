import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import AnimateOnScroll from '@/components/ui/animate-on-scroll';
import { getPlatformConfig } from '@/lib/config-server';
import { ROLES, TRACTION_AS_OF, findRole, teamContactHref } from '@/lib/build-page';
import { BuildCta, TrackRoleView } from '../BuildCta';

/**
 * Detail satu peran founding team . /build/<slug>.
 *
 * Empat halaman ini dibuat dari daftar yang sama dengan kartu di /build
 * (`ROLES`), jadi judul dan ringkasannya tidak bisa menyimpang antara kartu
 * dan halamannya.
 *
 * Yang membedakan halaman ini dari lowongan biasa ada di bagian "Sejujurnya":
 * keadaan tahap awal ditulis apa adanya . tidak ada gaji setara pasar hari
 * ini. Menyembunyikannya sampai percakapan pertama hanya membuang waktu kedua
 * pihak, dan orang yang tetap datang setelah membacanya adalah orang yang
 * memang dicari halaman ini.
 */
export const revalidate = 600;

const SITE = 'https://poskojasa.com';

/**
 * Slug di luar keempat peran = 404 betulan, bukan halaman "tidak ditemukan"
 * ber-status 200.
 *
 * Tanpa ini Next merender slug tak dikenal sesuai permintaan lalu memanggil
 * `notFound()` . dan pada deployment ini hasilnya sudah terbukti dikirim
 * dengan status 200 (lihat catatan pada redirect /legal/privacy di
 * next.config.ts). Halaman "tidak ditemukan" ber-status 200 adalah soft-404:
 * Google mengindeksnya sebagai halaman sungguhan. Karena keempat peran sudah
 * diketahui saat build, tidak ada alasan menerima slug lain sama sekali.
 */
export const dynamicParams = false;

/** Keempat peran dirender saat build . tidak ada yang bergantung pada request. */
export function generateStaticParams() {
  return ROLES.map((r) => ({ role: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role: slug } = await params;
  const role = findRole(slug);
  if (!role) return { title: 'Peran tidak ditemukan' };

  const description = `${role.headline} ${role.summary}`;

  return {
    title: `${role.title} - Build With Us`,
    description,
    alternates: { canonical: `${SITE}/build/${role.slug}` },
    // Diulang lengkap: Next MENGGANTI objek openGraph root, tidak menggabungnya.
    openGraph: {
      title: `${role.title} di Posko - Build With Us`,
      description,
      url: `${SITE}/build/${role.slug}`,
      type: 'website',
      locale: 'id_ID',
      siteName: 'Posko Jasa',
      images: [
        { url: '/og-default.png', width: 1200, height: 630, alt: `${role.title} di Posko` },
      ],
    },
  };
}

export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const role = findRole(slug);
  if (!role) notFound();

  // Lamaran peran = jalur TIM (alamat perusahaan dari /config), bukan jalur
  // founder: undangannya terbuka, jumlahnya bisa banyak, dan suatu saat perlu
  // ikut dipilah orang lain. Subjeknya memuat nama peran . itu yang membedakan
  // lamaran Growth dari lamaran Engineering di kotak masuk yang sama.
  const cfg = await getPlatformConfig();
  const emailLamar = teamContactHref(cfg, `${role.title} - Posko Build With Us`);

  const lainnya = ROLES.filter((r) => r.slug !== role.slug);

  return (
    <div className="page-h bg-white">
      <TrackRoleView role={role.slug} />

      {/* ── Hero ── */}
      <header className="border-b border-brand-gray-100">
        <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-12 sm:pt-10 sm:pb-16">
          <Link
            href="/build"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-gray-450 transition-colors hover:text-brand-gray-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Build With Us
          </Link>

          <p className="mt-8 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-brand-gray-900">
            Founding Team
            <span className="h-px w-6 bg-brand-red" aria-hidden />
            <span className="text-brand-red">Early Stage</span>
          </p>

          <h1 className="mt-5 text-[32px] font-black leading-[1.06] tracking-tight text-brand-gray-900 sm:text-[52px]">
            {role.title}
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] font-semibold leading-snug text-brand-gray-900 sm:text-[22px]">
            {role.headline}
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-brand-gray-700">
            {role.summary}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {role.focus.map((f) => (
              <span
                key={f}
                className="rounded-full border border-brand-gray-100 bg-brand-gray-60 px-3 py-1.5 text-[12px] font-bold text-brand-gray-900"
              >
                {f}
              </span>
            ))}
          </div>

          <div className="mt-8">
            <BuildCta href={emailLamar} position="role-hero" intent="team" variant="primary">
              Hubungi Kami
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
            </BuildCta>
          </div>
        </div>
      </header>

      {/* ── Yang dikerjakan ── */}
      <AnimateOnScroll>
        <section className="border-b border-brand-gray-100 bg-brand-gray-60">
          <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
            <h2 className="text-[22px] font-black tracking-tight text-brand-gray-900 sm:text-[30px]">
              Yang akan kamu kerjakan
            </h2>
            <ul className="mt-6 space-y-3">
              {role.work.map((w) => (
                <li
                  key={w}
                  className="flex items-start gap-3 rounded-xl border border-brand-gray-100 bg-white p-4 sm:p-5"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red"
                    aria-hidden
                  />
                  <span className="text-[14px] leading-relaxed text-brand-gray-700">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ── Yang kami cari ── */}
      <AnimateOnScroll>
        <section className="border-b border-brand-gray-100">
          <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
            <h2 className="text-[22px] font-black tracking-tight text-brand-gray-900 sm:text-[30px]">
              Yang kami cari
            </h2>
            <ul className="mt-6 space-y-3">
              {role.looking.map((l) => (
                <li key={l} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" aria-hidden />
                  <span className="text-[14px] leading-relaxed text-brand-gray-700">{l}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-brand-gray-450">
              Tidak ada syarat gelar, lama pengalaman, atau daftar tools wajib. Yang kami lihat
              adalah apa yang pernah kamu bangun dan bagaimana kamu memutuskan.
            </p>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ══════════════════════════════════════════════════════════════
          SEJUJURNYA . bagian yang paling penting di halaman ini
          ══════════════════════════════════════════════════════════════ */}
      <AnimateOnScroll>
        <section className="bg-brand-gray-900">
          <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
            <h2 className="text-[22px] font-black tracking-tight text-white sm:text-[30px]">
              Sejujurnya, ini tahap awal
            </h2>
            <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-white/75">
              <p>
                Posko belum bisa menawarkan gaji setara perusahaan yang sudah mapan. Yang kami
                bicarakan sejak percakapan pertama adalah bentuk kerja samanya . kompensasi tahap
                awal, kepemilikan, atau kombinasi keduanya . dan itu ditentukan bersama, bukan
                diberitahukan sepihak.
              </p>
              <p>
                Sebagai gantinya: cakupan kerja yang jauh lebih luas daripada peran yang sama di
                perusahaan besar, keputusan yang benar-benar kamu ambil sendiri, dan produk yang
                sudah dipakai orang sejak hari pertama kamu bergabung.
              </p>
              <p>
                Kami juga tidak akan berpura-pura semuanya sudah rapi. Per {TRACTION_AS_OF} Posko
                baru hidup di satu kota dengan puluhan mitra pertama. Kalau angka itu terdengar
                kecil, memang kecil . dan itulah alasan halaman ini ada.
              </p>
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ── CTA ── */}
      <AnimateOnScroll>
        <section className="border-b border-brand-gray-100">
          <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
            <h2 className="max-w-2xl text-[24px] font-black leading-tight tracking-tight text-brand-gray-900 sm:text-[36px]">
              Tertarik? Ceritakan apa yang pernah kamu bangun.
            </h2>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-brand-gray-700">
              Tidak perlu CV formal. Kirim apa pun yang paling mewakili caramu bekerja . portofolio,
              tautan, atau satu paragraf tentang masalah yang pernah kamu selesaikan.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <BuildCta href={emailLamar} position="role-penutup" intent="team" variant="primary">
                Hubungi Kami
                <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
              </BuildCta>
              <BuildCta href="/build#investors" position="role-penutup" intent="investor" variant="outline">
                Saya investor
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </BuildCta>
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ── Peran lain ── */}
      <AnimateOnScroll>
        <section className="bg-brand-gray-60">
          <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.18em] text-brand-gray-450">
              Peran lain
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {lainnya.map((r) => (
                <Link
                  key={r.slug}
                  href={`/build/${r.slug}`}
                  className="group rounded-xl border border-brand-gray-100 bg-white p-5 transition-colors hover:border-brand-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                >
                  <p className="text-[15px] font-black tracking-tight text-brand-gray-900">
                    {r.title}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-red">
                    Explore Role
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </AnimateOnScroll>
    </div>
  );
}
