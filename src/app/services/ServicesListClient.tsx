"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import { fetchAPI } from '@/lib/api';
import type { PublicService } from '@/hooks/usePublicServices';
import type { Category } from '@/types/category';

const PAGE_SIZE = 24;

// Filter kategori sengaja berupa <Link> (navigasi), bukan state klien: URL jadi
// bisa dibagikan & di-render server, sehingga tiap tampilan terfilter tetap
// punya HTML berisi konten. Paginasi ("muat lebih banyak") baru pakai state.
export default function ServicesListClient({
  initialServices,
  categories,
  activeCategory,
}: {
  initialServices: PublicService[];
  categories: Category[];
  activeCategory?: string;
}) {
  const [items, setItems] = useState<PublicService[]>(initialServices);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialServices.length < PAGE_SIZE);
  const [error, setError] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    setError(false);
    try {
      const qs = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(items.length),
      });
      if (activeCategory) qs.append('category', activeCategory);
      const res = await fetchAPI<PublicService[]>(`/services?${qs.toString()}`);
      const next = res.data ?? [];
      setItems((prev) => [...prev, ...next]);
      if (next.length < PAGE_SIZE) setDone(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f4] flex flex-col">
      <MobilePageHeader title="Semua Layanan" backHref="/" maxWidthClass="max-w-6xl" />
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 md:p-8">
        <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b] mb-6">Semua Layanan</h1>

        {/* Filter kategori */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
          <Link
            href="/services"
            className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors ${
              !activeCategory
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-[#1c1b1b] border-[#e5e2e1] hover:border-brand-blue'
            }`}
          >
            Semua
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/services?category=${cat.id}`}
              className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors ${
                activeCategory === cat.id
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-[#1c1b1b] border-[#e5e2e1] hover:border-brand-blue'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            Belum ada layanan pada kategori ini.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
              {items.map((service) => (
                <ServiceProductCard key={service.id} service={service} />
              ))}
            </div>

            {error && (
              <div className="text-center text-sm text-red-500 mt-6">
                Gagal memuat layanan. Coba lagi.
              </div>
            )}

            {!done && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-md border border-[#e5e2e1] bg-white text-[14px] font-medium text-[#1c1b1b] hover:border-brand-blue disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Memuat…' : 'Muat lebih banyak'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
