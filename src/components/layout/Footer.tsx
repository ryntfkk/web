"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, MapPin, MessageCircle, Phone, ShieldCheck, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { slugify } from '@/lib/slug';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import type { Category } from '@/types/category';

interface FooterLink {
  label: string;
  href: string;
  /**
   * Pil kecil di sebelah label. Dipakai SANGAT hemat . footer ini dinding
   * teks abu 13px, dan tautan yang bentuknya persis sama dengan "Kebijakan
   * Privasi" tidak akan pernah diklik. Satu penanda membuatnya terbaca sebagai
   * ajakan; dua penanda membuat keduanya kembali tak terlihat.
   */
  badge?: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

// Semua href di bawah WAJIB rute yang benar-benar ada di src/app. Footer tampil
// di setiap halaman pelanggan . satu tautan mati di sini berarti 404 yang
// terlihat di seluruh situs sekaligus (dan di Amplify rute dinamis yang
// notFound() disajikan 200, jadi tidak selalu ketahuan dari log).
const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang Kami', href: '/about' },
      { label: 'Build With Us', href: '/build', badge: 'Hiring' },
      { label: 'Syarat & Ketentuan', href: '/terms' },
      { label: 'Kebijakan Privasi', href: '/privacy' },
      { label: 'Pembatalan & Refund', href: '/legal/cancellation' },
    ],
  },
  {
    title: 'Untuk Pelanggan',
    links: [
      { label: 'Semua Kategori', href: '/categories' },
      { label: 'Semua Layanan', href: '/services' },
      { label: 'Promo', href: '/promos' },
      { label: 'Pesanan Saya', href: '/orders' },
    ],
  },
  {
    title: 'Untuk Mitra',
    links: [
      { label: 'Gabung Jadi Mitra', href: '/jadi-mitra' },
      { label: 'Daftar Mitra', href: '/jadi-mitra/daftar' },
      { label: 'Syarat & Ketentuan Mitra', href: '/legal/partner-terms' },
    ],
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'Pusat Bantuan', href: '/help' },
      { label: 'Chat dengan CS', href: '/bantuan' },
      { label: 'Hapus Akun', href: '/hapus-akun' },
    ],
  },
];

/**
 * Metode pembayaran yang BENAR-BENAR dilayani . cerminan pilihan di
 * `/payment/[order_id]` (Saldo Dompet, QRIS & E-Wallet, Virtual Account) dan
 * daftar kanal di `backend/internal/payment/handler.go`.
 *
 * Jangan menambah bank atau e-wallet "supaya kelihatan lengkap": pelanggan
 * yang memilih layanan karena melihat namanya di footer akan berhenti di
 * halaman bayar, dan itu kegagalan yang mahal.
 */
const PAYMENT_METHODS = [
  'QRIS',
  'GoPay',
  'OVO',
  'DANA',
  'ShopeePay',
  'BCA Virtual Account',
  'Mandiri Virtual Account',
  'BNI Virtual Account',
  'BRI Virtual Account',
];

// SE: "Jasa Populer" . link ke landing lokal /jasa/[slug]/[kota] dari setiap
// halaman (footer tampil di semua page). Bantu Google discover landing lokal
// + navigasi pelanggan. Fetch kategori utama + kota mitra via React Query;
// link selalu valid (slug & kota dari API, bukan hardcode).
const MAX_POPULAR_CATEGORIES = 6;
const MAX_POPULAR_CITIES = 4;
const MAX_POPULAR_LINKS = 12;

function useFooterPopularLinks(enabled: boolean) {
  return useQuery({
    queryKey: ['footer-popular-links'],
    // Footer tidak dirender di /mitra & /chat . tanpa ini kedua request tetap
    // ditembakkan di tiap halaman mode mitra untuk tautan yang tak pernah tampil.
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [catsRes, citiesRes] = await Promise.all([
        fetchAPI<Category[]>('/categories'),
        fetchAPI<string[]>('/partners/cities'),
      ]);
      const mainCats = (catsRes.data ?? [])
        .filter((c) => !c.parent_id && c.slug && c.is_active)
        .slice(0, MAX_POPULAR_CATEGORIES);
      const cities = (citiesRes.data ?? [])
        .filter(Boolean)
        .slice(0, MAX_POPULAR_CITIES);
      // Kombinasi: kategori × kota, dipotong agar tidak jadi ladang tautan.
      const links: FooterLink[] = [];
      for (const cat of mainCats) {
        for (const city of cities) {
          if (!cat.slug) continue;
          const citySlug = slugify(city);
          if (!citySlug) continue;
          links.push({
            label: `${cat.name} ${city}`,
            href: `/jasa/${cat.slug}/${citySlug}`,
          });
          if (links.length >= MAX_POPULAR_LINKS) return links;
        }
      }
      return links;
    },
  });
}

// Nomor di `platform_profile` disimpan dalam format kanonik 62xxx (lihat
// utils.NormalizePhone di backend), tetapi admin bisa saja mengetik 08xxx.
// Dinormalkan di sini supaya tautan wa.me tidak pernah mati.
function waHref(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

export default function Footer() {
  const pathname = usePathname();
  // Mode mitra TIDAK memakai kerangka pelanggan . `HeaderWrapper` sudah menepi
  // untuk /mitra, dan footer harus ikut. Tanpa ini dashboard mitra diakhiri
  // kolom SEO "Kategori Populer/Kota Populer" milik sisi pelanggan, dan
  // `max-w-[1200px]`-nya terpusat pada VIEWPORT sementara konten bergeser 240px
  // oleh sidebar . jadi terlihat miring pula.
  // `/bantuan/[id]` juga: ruang percakapan setinggi layar penuh, dan footer
  // pemasaran 4 kolom yang menempel di bawahnya membuat layar chat bisa
  // di-scroll ke "Jasa Populer". Daftar /bantuan tetap berfooter.
  const hidden =
    pathname.startsWith('/chat') ||
    pathname.startsWith('/mitra') ||
    pathname.startsWith('/bantuan/');
  // Hook dipanggil sebelum early-return agar rules-of-hooks terpenuhi.
  const { data: popularLinks } = useFooterPopularLinks(!hidden);
  const { profile } = usePlatformConfig();
  if (hidden) return null;

  const brandName = profile?.brand_name || 'POSKO JASA';

  return (
    <footer className="hidden md:block w-full bg-brand-gray-60 border-t border-brand-gray-100 mt-auto">
      <div className="container mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-12">
        {/* Baris atas: identitas (4/12) + empat kolom tautan (2/12 masing-masing). */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-10">
          {/* Kolom identitas . memberi footer "jangkar" dan tempat kontak,
              sehingga tidak sekadar deretan tautan mengambang. */}
          <div className="col-span-2 lg:col-span-4 lg:pr-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-[22px] font-bold tracking-[-0.6px] text-brand-gray-900">
                POSKO
              </span>
              <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-red">
                Jasa
              </span>
            </Link>
            <p className="mt-3 text-[13px] leading-[1.7] text-brand-gray-700 max-w-sm">
              Marketplace jasa terpercaya untuk menemukan dan memesan jasa profesional
              di dekat Anda. Harga tampil di awal, jadwal Anda yang tentukan, dan
              pembayaran ditahan sampai pekerjaan beres.
            </p>

            {/* Kontak dari platform_profile. Field kosong tidak dirender . lebih
                baik absen daripada mencetak placeholder yang terbaca seperti
                data hilang. */}
            <ul className="mt-4 flex flex-col gap-2 text-[13px] text-brand-gray-700">
              {profile?.support_email && (
                <li>
                  <a
                    href={`mailto:${profile.support_email}`}
                    className="inline-flex items-center gap-2 hover:text-brand-red transition-colors"
                  >
                    <Mail className="w-4 h-4 shrink-0 text-brand-gray-450" />
                    {profile.support_email}
                  </a>
                </li>
              )}
              {profile?.support_phone && (
                <li>
                  <a
                    href={`tel:+${profile.support_phone.replace(/\D/g, '')}`}
                    className="inline-flex items-center gap-2 hover:text-brand-red transition-colors"
                  >
                    <Phone className="w-4 h-4 shrink-0 text-brand-gray-450" />
                    {profile.support_phone}
                  </a>
                </li>
              )}
              {profile?.support_whatsapp && (
                <li>
                  <a
                    href={waHref(profile.support_whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-brand-red transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0 text-brand-gray-450" />
                    WhatsApp {profile.support_whatsapp}
                  </a>
                </li>
              )}
              {profile?.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-brand-gray-450" />
                  <span className="leading-[1.6]">{profile.address}</span>
                </li>
              )}
            </ul>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lg:col-span-2">
              <h3 className="text-[14px] font-semibold text-brand-gray-900 mb-3">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-1.5 text-[13px] text-brand-gray-700 hover:text-brand-red transition-colors"
                    >
                      {link.label}
                      {link.badge && (
                        <span className="rounded-full bg-brand-red-soft px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-red">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Jasa Populer . dipindah jadi baris chip selebar footer (dulu kolom
            ke-5 yang sempit dan memaksa label terpotong dua baris). */}
        {popularLinks && popularLinks.length > 0 && (
          <nav aria-label="Jasa Populer" className="mt-10 pt-6 border-t border-brand-gray-100">
            <h3 className="text-[14px] font-semibold text-brand-gray-900 mb-3">
              Jasa Populer
            </h3>
            <ul className="flex flex-wrap gap-2">
              {popularLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-brand-gray-100 text-[13px] text-brand-gray-700 hover:border-brand-red hover:text-brand-red transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Metode pembayaran + jaminan . dua hal yang paling sering dicari
            pengunjung baru sebelum memutuskan memesan. */}
        <div className="mt-10 pt-6 border-t border-brand-gray-100 grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <h3 className="text-[14px] font-semibold text-brand-gray-900 mb-3">
              Metode Pembayaran
            </h3>
            <ul className="flex flex-wrap gap-2">
              <li className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-brand-gray-100 text-[12px] font-medium text-brand-gray-700">
                <Wallet className="w-3.5 h-3.5 text-brand-gray-450" />
                Saldo Dompet
              </li>
              {PAYMENT_METHODS.map((method) => (
                <li
                  key={method}
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-white border border-brand-gray-100 text-[12px] font-medium text-brand-gray-700"
                >
                  {method}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-4">
            <h3 className="text-[14px] font-semibold text-brand-gray-900 mb-3">
              Jaminan Posko
            </h3>
            <ul className="flex flex-col gap-2 text-[13px] text-brand-gray-700">
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-brand-success" />
                Pembayaran aman &amp; terenkripsi
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-brand-success" />
                Dana ditahan Posko sampai pekerjaan selesai
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-brand-success" />
                Mitra melewati kurasi identitas &amp; dokumen
              </li>
            </ul>
          </div>
        </div>

        {/* Bar bawah . identitas hukum. Field kosong tetap tidak dirender. */}
        <div className="mt-10 pt-6 border-t border-brand-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-[13px] text-brand-gray-700">
            <span>
              &copy; {new Date().getFullYear()} {profile?.legal_name || brandName}
            </span>
            <span className="hidden md:inline text-brand-gray-400">·</span>
            <span>Platform Marketplace Jasa Terpercaya</span>
            {profile?.business_id && (
              <>
                <span className="hidden md:inline text-brand-gray-400">·</span>
                <span>NIB/NPWP {profile.business_id}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-[13px] text-brand-gray-700">
            <Link href="/terms" className="hover:text-brand-red transition-colors">
              Syarat
            </Link>
            <span className="text-brand-gray-400">·</span>
            <Link href="/privacy" className="hover:text-brand-red transition-colors">
              Privasi
            </Link>
            <span className="text-brand-gray-400">·</span>
            <Link href="/help" className="hover:text-brand-red transition-colors">
              Bantuan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
