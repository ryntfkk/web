import type { Metadata } from 'next';

// Praktik terbaik Google SEO: halaman auth (login/register/forgot-password/
// lengkapi-profil) adalah UTILITAS, bukan konten yang dicari lewat Google.
// Semua page-nya Client Component tanpa metadata sendiri → tanpa layout ini
// mereka mewarisi metadata root (index:true + canonical HOMEPAGE + judul brand),
// jadi bocor ke indeks Google dengan canonical & judul yang salah.
//
// noindex mencegahnya terindeks; `follow` tetap true agar tautan di dalamnya
// (ke beranda/kategori) tetap mengalirkan sinyal. Pola sama seperti
// categories/layout.tsx: page = client, metadata dipasang lewat layout server.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
