import type { Metadata } from 'next';

// /jadi-mitra/daftar = FORM pendaftaran (Client Component), bukan halaman
// pemasaran. Landing SEO-nya adalah /jadi-mitra (terindeks + ada di sitemap).
// Tanpa metadata sendiri, form ini mewarisi root (index:true + canonical
// HOMEPAGE) → bocor ke Google. noindex,follow: jangan indeks form, tapi tetap
// alirkan tautan. Judul dirapikan agar tab browser tak memakai judul beranda.
export const metadata: Metadata = {
  title: 'Daftar Jadi Mitra',
  robots: { index: false, follow: true },
};

export default function DaftarMitraLayout({ children }: { children: React.ReactNode }) {
  return children;
}
