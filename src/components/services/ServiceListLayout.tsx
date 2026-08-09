'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ServiceGridSkeleton } from '@/components/ui/skeleton';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import FilterPanel from '@/components/search/FilterPanel';
import SortBar from '@/components/search/SortBar';
import type { PublicService } from '@/hooks/usePublicServices';

interface ServiceListLayoutProps {
  /** Hasil yang sudah ter-filter rating (client-side). */
  services: PublicService[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  /** Filter state. */
  city: string;
  onCityChange: (c: string) => void;
  minRating: number;
  onMinRatingChange: (r: number) => void;
  sort: string;
  onSortChange: (s: string) => void;
  /** Filter jenis mitra (M2). '' = semua. */
  partnerType: string;
  onPartnerTypeChange: (t: string) => void;
  /** Konteks tampilan. */
  isSearch: boolean;
  /** Query pencarian (untuk teks empty state). */
  query?: string;
  /** Apakah halaman pertama sedang loading (bukan load-more). */
  isInitialLoading: boolean;
}

/**
 * Layout bersama untuk daftar layanan: FilterPanel + SortBar + grid + load more.
 * Dipakai oleh /services (SSR) dan /search (CSR) agar UX identik.
 */
export default function ServiceListLayout({
  services,
  isLoading,
  isError,
  hasNextPage,
  onLoadMore,
  onRetry,
  city,
  onCityChange,
  minRating,
  onMinRatingChange,
  sort,
  onSortChange,
  partnerType,
  onPartnerTypeChange,
  isSearch,
  query,
  isInitialLoading,
}: ServiceListLayoutProps) {
  const router = useRouter();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const emptyTitle = isSearch && query
    ? `Tidak ada hasil untuk "${query}"`
    : 'Tidak ada mitra tersedia';

  const emptyDescription = city
    ? `Belum ada mitra di ${city} yang cocok dengan filter kamu. Coba kota lain atau ubah filter rating.`
    : 'Coba ubah filter atau kata kunci pencarian.';

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
      <FilterPanel
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        city={city}
        onCityChange={onCityChange}
        minRating={minRating}
        onMinRatingChange={onMinRatingChange}
        partnerType={partnerType}
        onPartnerTypeChange={onPartnerTypeChange}
      />

      {/* Main Results Area */}
      <div className="flex-1 flex flex-col w-full min-w-0">
        <SortBar
          onOpenFilter={() => setIsMobileFilterOpen(true)}
          sort={sort}
          onSortChange={onSortChange}
        />

        {/* Service Grid */}
        {isInitialLoading ? (
          <div className="mt-4 md:mt-6">
            <ServiceGridSkeleton count={8} />
          </div>
        ) : isError ? (
          <div className="mt-4 md:mt-6">
            <EmptyState
              variant="error"
              icon={RefreshCw}
              title="Gagal memuat hasil"
              action={
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Coba Lagi
                </Button>
              }
            />
          </div>
        ) : services.length === 0 ? (
          <div className="mt-4 md:mt-6">
            <EmptyState
              variant="search"
              icon={SearchX}
              title={emptyTitle}
              description={emptyDescription}
              action={
                <div className="flex flex-col sm:flex-row gap-2">
                  {minRating > 0 && (
                    <Button variant="outline" size="sm" onClick={() => onMinRatingChange(0)}>
                      Hapus Filter Rating
                    </Button>
                  )}
                  {city && (
                    <Button variant="outline" size="sm" onClick={() => onCityChange('')}>
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
            {services.map((service) => (
              <ServiceProductCard key={service.id} service={service} />
            ))}
          </div>
        )}

        {/* Muat Lebih Banyak */}
        {hasNextPage && (
          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoading}
              className="w-full sm:w-auto px-8"
            >
              {isLoading ? 'Memuat...' : 'Muat Lebih Banyak'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
