import type { Metadata } from 'next';

// SE4: metadata untuk /categories. Halaman page.tsx = client component, jadi
// metadata dipasang lewat layout (server) yang membungkusnya.
export const metadata: Metadata = {
  title: 'Kategori Jasa',
  description: 'Temukan jasa berdasarkan kategori: AC, kebersihan, perbaikan, dan lainnya.',
  alternates: { canonical: 'https://poskojasa.com/categories' },
};

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
