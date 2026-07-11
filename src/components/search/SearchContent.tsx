"use client";

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/search/Breadcrumbs';
import FilterPanel from '@/components/search/FilterPanel';
import SortBar from '@/components/search/SortBar';
import Pagination from '@/components/search/Pagination';
import { ServiceCard } from '@/components/ui/service-card';
import { usePartners } from '@/hooks/usePartners';
import { useUserLocation } from '@/hooks/useUserLocation';
import type { Partner } from '@/types/partner';

import { PLACEHOLDER_SERVICE as PLACEHOLDER_IMG } from '@/lib/images';

interface SearchContentProps {
  query?: string;
}

export default function SearchContent({ query }: SearchContentProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const { latitude, longitude, hasLocation, permissionStatus } = useUserLocation();

  const { data: partners, isLoading, isError, refetch } = usePartners({
    q: query,
    per_page: 12,
    latitude: hasLocation ? latitude ?? undefined : undefined,
    longitude: hasLocation ? longitude ?? undefined : undefined,
  });

  const formatDistance = (km: number): string | undefined => {
    if (!hasLocation || km <= 0) return undefined;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  return (
    <>
      <Breadcrumbs query={query} />

      {/* Container (Filter + Results) */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
        <FilterPanel isOpen={isMobileFilterOpen} onClose={() => setIsMobileFilterOpen(false)} />

        {/* Main Results Area */}
        <div className="flex-1 flex flex-col w-full min-w-0">
          <SortBar onOpenFilter={() => setIsMobileFilterOpen(true)} />

          {permissionStatus === 'denied' && (
            <div className="mt-4 flex items-center gap-2 text-[12px] sm:text-[13px] text-[#5b403e] bg-[#fcf9f8] border border-[#e5e2e1] rounded-[4px] px-3 py-2">
              <MapPinOff className="w-4 h-4 flex-shrink-0" />
              <span>Aktifkan lokasi untuk melihat rekomendasi mitra terdekat di sekitar Anda.</span>
            </div>
          )}

          {/* Service Card Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mt-4 md:mt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[250px] bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center mt-4 md:mt-6">
              <p className="text-sm text-red-500">Gagal memuat hasil pencarian.</p>
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
          ) : partners?.length === 0 ? (
            <div className="mt-6 text-center text-gray-500 py-10">Belum ada mitra di area ini.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mt-4 md:mt-6">
              {partners?.map((partner: Partner) => (
                <Link key={partner.id} href={`/${partner.username}`} className="block">
                  <ServiceCard
                    vendorName={partner.name}
                    category={partner.categories?.[0]?.name || 'Umum'}
                    rating={partner.avg_rating}
                    reviewCount={partner.total_reviews}
                    price={partner.starting_price}
                    unit="Jasa"
                    imageUrl={partner.avatar_url || PLACEHOLDER_IMG}
                    location={formatDistance(partner.distance_km)}
                  />
                </Link>
              ))}
            </div>
          )}

          <Pagination />
        </div>
      </div>
    </>
  );
}
