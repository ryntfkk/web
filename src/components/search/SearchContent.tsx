"use client";

import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/search/Breadcrumbs';
import FilterPanel from '@/components/search/FilterPanel';
import SortBar from '@/components/search/SortBar';
import Pagination from '@/components/search/Pagination';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import { usePublicServices } from '@/hooks/usePublicServices';
import { useCityFilter } from '@/lib/store/cityFilterStore';
import { useUserLocation } from '@/hooks/useUserLocation';

interface SearchContentProps {
  query?: string;
}

export default function SearchContent({ query }: SearchContentProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const { city, setCity } = useCityFilter();
  const { latitude, longitude, hasLocation } = useUserLocation();
  const [minRating, setMinRating] = useState(0);

  const { data: services, isLoading, isError, refetch } = usePublicServices({
    q: query,
    city: city || undefined,
    limit: 24,
    latitude: hasLocation ? latitude ?? undefined : undefined,
    longitude: hasLocation ? longitude ?? undefined : undefined,
  });

  // Filter rating (rating mitra) diterapkan di sisi klien atas hasil.
  const visibleServices = useMemo(
    () => (services ?? []).filter((s) => (s.partner_avg_rating ?? 0) >= minRating),
    [services, minRating],
  );

  return (
    <>
      <Breadcrumbs query={query} />

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
          <SortBar onOpenFilter={() => setIsMobileFilterOpen(true)} />

          {/* Service Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mt-4 md:mt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[250px] bg-[#e5e2e1] animate-pulse rounded-md" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center mt-4 md:mt-6">
              <p className="text-sm text-[#b51822]">Gagal memuat hasil pencarian.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="text-[12px] sm:text-[13px] h-auto py-1.5 px-4"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Coba Lagi
              </Button>
            </div>
          ) : visibleServices.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-[#f0eded] flex items-center justify-center mb-4">
                <RefreshCw className="w-7 h-7 text-[#9e8e8c]" />
              </div>
              <h3 className="text-base font-semibold text-[#1c1b1b] mb-1">
                {query ? `Tidak ada hasil untuk "${query}"` : 'Tidak ada mitra tersedia'}
              </h3>
              <p className="text-sm text-[#5b403e] mb-5 max-w-xs">
                {city
                  ? `Belum ada mitra di ${city} yang cocok dengan filter kamu. Coba kota lain atau ubah filter rating.`
                  : 'Coba ubah filter atau kata kunci pencarian.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                {minRating > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMinRating(0)}
                    className="text-xs border-[#e5e2e1] text-[#5b403e]"
                  >
                    Hapus Filter Rating
                  </Button>
                )}
                {city && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCity('')}
                    className="text-xs border-[#e5e2e1] text-[#5b403e]"
                  >
                    Semua Kota
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mt-4 md:mt-6">
              {visibleServices.map((service) => (
                <ServiceProductCard key={service.id} service={service} />
              ))}
            </div>
          )}

          <Pagination />
        </div>
      </div>
    </>
  );
}
