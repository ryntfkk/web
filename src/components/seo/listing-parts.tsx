import Link from 'next/link';
import { ChevronRight, ShieldCheck, Wallet, Star, CalendarCheck } from 'lucide-react';

// Potongan UI bersama untuk halaman listing SEO (/kategori/[slug] dan
// /jasa/[kategori]/[kota]). Semua server component (tanpa JS klien) agar
// HTML-nya utuh untuk crawler dan tidak menambah bundle.

export interface Crumb {
  name: string;
  href: string;
}

/**
 * Breadcrumb terlihat. Disembunyikan di mobile (sm:) karena di sana sudah ada
 * MobilePageHeader dengan tombol kembali . dua baris navigasi = boros ruang.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 hidden sm:flex items-center gap-1.5 text-[12px] text-brand-gray-400 flex-wrap"
    >
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
          {i < crumbs.length - 1 ? (
            <Link href={c.href} className="hover:text-brand-red transition-colors">
              {c.name}
            </Link>
          ) : (
            <span className="font-semibold text-brand-gray-900">{c.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Kartu putih untuk kolom samping desktop / blok bawah di mobile. */
export function AsideCard({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-brand-gray-100 bg-white p-3.5 ${className}`}>
      {title && <h2 className="text-[14px] font-bold text-brand-gray-900 mb-2.5">{title}</h2>}
      {children}
    </section>
  );
}

/**
 * Daftar chip tautan. Di mobile menggulir horizontal satu baris (hemat tinggi
 * layar), di sm+ membungkus normal.
 */
export function ChipLinks({
  items,
  scrollOnMobile = false,
}: {
  items: { label: string; href: string }[];
  scrollOnMobile?: boolean;
}) {
  if (!items.length) return null;
  const wrapper = scrollOnMobile
    ? 'flex gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap'
    : 'flex flex-wrap gap-2';
  return (
    <div className={wrapper}>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="inline-flex shrink-0 items-center rounded-full border border-brand-gray-100 bg-white px-3 py-1.5 text-[12px] font-medium text-brand-gray-900 whitespace-nowrap transition-colors hover:border-brand-red hover:text-brand-red"
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

const TRUST_POINTS = [
  { Icon: ShieldCheck, text: 'Mitra terverifikasi identitas sebelum menerima pesanan' },
  { Icon: Wallet, text: 'Harga tampil transparan sebelum Anda membayar' },
  { Icon: Star, text: 'Ulasan asli dari pelanggan yang benar-benar memesan' },
  { Icon: CalendarCheck, text: 'Pesan online, mitra datang sesuai jadwal Anda' },
];

/** Blok kepercayaan . mengisi kolom samping desktop sekaligus sinyal E-E-A-T. */
export function TrustBox() {
  return (
    <AsideCard title="Kenapa pesan di Posko Jasa">
      <ul className="space-y-2.5">
        {TRUST_POINTS.map(({ Icon, text }) => (
          <li key={text} className="flex gap-2 text-[12.5px] leading-snug text-brand-gray-700">
            <Icon className="w-4 h-4 shrink-0 text-brand-red mt-px" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </AsideCard>
  );
}
