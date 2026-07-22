import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import ServicesListClient from './ServicesListClient';
import { API_URL } from '@/lib/api';
import JsonLd from '@/components/seo/JsonLd';
import type { PublicService } from '@/hooks/usePublicServices';
import type { Category } from '@/types/category';

// Halaman "Semua Layanan" (daftar). Sebelumnya route ini me-render detail
// layanan lewat ?id= sehingga tanpa id tampil state kosong (risiko soft-404).
// Kini: daftar sungguhan + filter kategori, dan ?id= lama di-redirect permanen
// ke route bersih /services/<id> agar bookmark/tautan lama tetap hidup dan
// bobot SEO-nya menyatu ke satu URL kanonik.
interface PageProps {
  searchParams: Promise<{ id?: string; category?: string }>;
}

export const revalidate = 300;

const SITE = 'https://poskojasa.com';
// Base ABSOLUT: API_URL bisa relatif ('/api/v1'); fetch relatif gagal di server Node.
const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';
const PAGE_SIZE = 24;

export const metadata: Metadata = {
  title: 'Semua Layanan',
  description: 'Jelajahi ribuan layanan jasa dari mitra terverifikasi di Posko Jasa.',
  alternates: { canonical: `${SITE}/services` },
};

async function getJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_API}${path}`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as T) ?? null;
  } catch {
    return null;
  }
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // URL lama /services?id=<uuid> → route kanonik baru (308 permanen).
  if (sp.id) {
    permanentRedirect(`/services/${sp.id}`);
  }

  const category = sp.category;
  const qs = new URLSearchParams({ limit: String(PAGE_SIZE), offset: '0' });
  if (category) qs.append('category', category);

  const [services, categories] = await Promise.all([
    getJSON<PublicService[]>(`/services?${qs.toString()}`),
    getJSON<Category[]>('/categories'),
  ]);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Beranda', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Semua Layanan', item: `${SITE}/services` },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <ServicesListClient
        initialServices={services ?? []}
        categories={categories ?? []}
        activeCategory={category}
      />
    </>
  );
}
