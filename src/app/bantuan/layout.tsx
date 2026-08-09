import type { Metadata } from 'next';

// Kotak masuk CS wajib login: isinya kosong bagi Googlebot. Tanpa noindex ia
// terindeks sebagai halaman tipis . dan di Amplify halaman kosong tetap
// menjawab 200, jadi robots.txt saja tidak cukup.
export const metadata: Metadata = {
  title: 'Chat Customer Service',
  robots: { index: false, follow: false },
};

export default function BantuanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
