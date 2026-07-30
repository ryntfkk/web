"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Clock, X, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ServiceGridSkeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/search/Breadcrumbs';
import FilterPanel from '@/components/search/FilterPanel';
import SortBar from '@/components/search/SortBar';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import { usePublicServices, PublicService } from '@/hooks/usePublicServices';
import { useCityFilter } from '@/lib/store/cityFilterStore';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useRecentSearchesStore } from '@/lib/store/recentSearchesStore';

interface SearchContentProps {
  query?: string;
}

export default function SearchContent({ query }: SearchContentProps) {
  const router = useRouter();
  const recentTerms = useRecentSearchesStore((s) => s.terms);
  const recordSearch = useRecentSearchesStore((s) => s.record);
  const removeSearch = useRecentSearchesStore((s) => s.remove);
  const clearSearches = useRecentSearchesStore((s) => s.clear);
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (query) recordSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const { city, setCity } = useCityFilter();
  const { latitude, longitude, hasLocation } = useUserLocation();
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('terpopuler');
  const [page, setPage] = useState(1);
  const limit = 24;
  const [allServices, setAllServices] = useState<PublicService[]>([]);

  const { data: services, isLoading, isError, refetch } = usePublicServices({
    q: query,
    city: city || undefined,
    limit,
    offset: (page - 1) * limit,
    sort, // akan digunakan jika backend support
    latitude: hasLocation ? latitude ?? undefined : undefined,
    longitude: hasLocation ? longitude ?? undefined : undefined,
  });

  // Note: we can't import inside component body, I will move import to top.
  // Oh wait I can just use React.useEffect.

  React.useEffect(() => {
    // Reset page and list when filters change
    setPage(1);
    setAllServices([]);
  }, [query, city, sort]);

  React.useEffect(() => {
    if (services) {
      if (page === 1) {
        setAllServices(services);
      } else {
        // avoid duplicates by checking IDs
        setAllServices(prev => {
          const newServices = services.filter(s => !prev.some(p => p.id === s.id));
          return [...prev, ...newServices];
        });
      }
    }
  }, [services, page]);

  const hasNextPage = services ? services.length >= limit : false;

  // Filter rating (rating mitra) diterapkan di sisi klien atas hasil.
  const visibleServices = useMemo(
    () => allServices.filter((s) => (s.partner_avg_rating ?? 0) >= minRating),
    [allServices, minRating],
  );

  return (
    <>
      <Breadcrumbs query={query} />

      {/* Pencarian terakhir — hanya saat menjelajah tanpa kata kunci */}
      {mounted && !query && recentTerms.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-gray-700">
              <Clock className="w-4 h-4" /> Pencarian Terakhir
            </span>
            <button onClick={clearSearches} className="text-xs font-medium text-brand-gray-400 hover:text-brand-red">
              Hapus semua
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentTerms.map((term) => (
              <span
                key={term}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-white border border-brand-gray-100 rounded-full text-sm text-brand-gray-900 hover:border-brand-red transition-colors"
              >
                <button onClick={() => router.push(`/search?q=${encodeURIComponent(term)}`)} className="truncate max-w-[160px]">
                  {term}
                </button>
                <button
                  onClick={() => removeSearch(term)}
                  aria-label={`Hapus ${term}`}
                  className="p-0.5 rounded-full text-brand-gray-400 hover:bg-brand-red-light hover:text-brand-red"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Container (Filter + Results) */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
        <FilterPanel
          isOpen={isMobileFilterOpen}
          onClose={() => setIsMobileFilterOpen(false)}
          city={city}
          onCityChange={setCity}
          minRating={minRating}
          onMinRatingChange={setMinRating}
        />

        {/* Main Results Area */}
        <div className="flex-1 flex flex-col w-full min-w-0">
          <SortBar 
            onOpenFilter={() => setIsMobileFilterOpen(true)} 
            sort={sort}
            onSortChange={setSort}
          />

          {/* Service Grid */}
          {isLoading && page === 1 ? (
            <div className="mt-4 md:mt-6">
              <ServiceGridSkeleton count={8} />
            </div>
          ) : isError ? (
            <div className="mt-4 md:mt-6">
              <EmptyState
                variant="error"
                icon={RefreshCw}
                title="Gagal memuat hasil pencarian"
                action={
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Coba Lagi
                  </Button>
                }
              />
            </div>
          ) : visibleServices.length === 0 ? (
            <div className="mt-4 md:mt-6">
              <EmptyState
                variant="search"
                icon={SearchX}
                title={query ? `Tidak ada hasil untuk "${query}"` : 'Tidak ada mitra tersedia'}
                description={
                  city
                    ? `Belum ada mitra di ${city} yang cocok dengan filter kamu. Coba kota lain atau ubah filter rating.`
                    : 'Coba ubah filter atau kata kunci pencarian.'
                }
                action={
                  <div className="flex flex-col sm:flex-row gap-2">
                    {minRating > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setMinRating(0)}>
                        Hapus Filter Rating
                      </Button>
                    )}
                    {city && (
                      <Button variant="outline" size="sm" onClick={() => setCity('')}>
                        Semua Kota
                      </Button>
                    )}
                    <Button size="sm" onClick={() => router.push('/categories')}>
                      Jelajahi Kategori
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6">
              {visibleServices.map((service) => (
                <ServiceProductCard key={service.id} service={service} />
              ))}
            </div>
          )}

          {/* Muat Lebih Banyak */}
          {hasNextPage && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={isLoading}
                className="w-full sm:w-auto px-8"
              >
                {isLoading ? 'Memuat...' : 'Muat Lebih Banyak'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
