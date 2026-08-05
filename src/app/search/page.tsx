import type { Metadata } from 'next';
import SearchContent from '@/components/search/SearchContent';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { permanentRedirect } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { slugify } from '@/lib/slug';
import type { Category } from '@/types/category';

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const SITE = 'https://poskojasa.com';
const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${SERVER_API}/categories`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

// SE: metadata dinamis + canonical strategy. Bila query cocok dengan nama/slug
// kategori yang ada, set canonical ke /kategori/[slug] (hindari duplikasi konten
// dengan halaman kategori yang lebih SEO-optimized). Bila tidak cocok, canonical
// ke /search?q=[query] sendiri (tangkap long-tail). TIDAK set noindex . biarkan
// indexable untuk kata kunci long-tail yang tidak punya halaman kategori sendiri.
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim() : undefined;
  if (!query) return {};

  const categories = await getCategories();
  const qLower = query.toLowerCase();
  const matchedCat = categories.find(
    (c) =>
      c.slug && (c.name.toLowerCase() === qLower || slugify(c.name) === slugify(query)),
  );

  const title = `Cari "${query}" - Posko Jasa`;
  const description = `Temukan jasa ${query} dari mitra terverifikasi di Posko Jasa. Pesan online, ulasan asli, harga transparan.`;

  if (matchedCat?.slug) {
    // Query cocok kategori → canonical ke halaman kategori (lebih kuat SEO-nya).
    return {
      title,
      description,
      alternates: { canonical: `${SITE}/kategori/${matchedCat.slug}` },
      openGraph: { title, description, url: `${SITE}/search?q=${encodeURIComponent(query)}` },
    };
  }

  return {
    title,
    description,
    alternates: { canonical: `${SITE}/search?q=${encodeURIComponent(query)}` },
    openGraph: { title, description, url: `${SITE}/search?q=${encodeURIComponent(query)}` },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim() : undefined;

  // Tanpa kata kunci → ini "semua layanan", bukan pencarian. Rute kanoniknya
  // /services (SSR + SEO metadata). Redirect permanen agar bookmark lama tetap
  // hidup dan bobot SEO menyatu ke /services.
  if (!query) {
    permanentRedirect('/services');
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-brand-gray-60">
      {/* Sticky Page Header */}
      <div className="bg-white border-b border-brand-gray-100 sticky top-0 z-10 lg:relative lg:z-auto">
        <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 md:px-6 lg:px-6">
          <div className="flex items-center gap-3 py-4">
            <Link href="/" aria-label="Kembali ke beranda" className="p-2 -ml-2 hover:bg-brand-gray-60 rounded-md transition-colors">
              <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
            </Link>
            <h1 className="text-base font-bold text-brand-gray-900 truncate">
              Hasil untuk &quot;{query}&quot;
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 md:px-6 lg:px-6 py-4 md:py-6 flex-1 pb-20 md:pb-10">
        <SearchContent query={query} />
      </div>

    </div>
  );
}
