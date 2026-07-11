"use client";

import Link from 'next/link';
import { RefreshCw, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/components/ui/service-card';
import { usePartners } from '@/hooks/usePartners';
import { useUserLocation } from '@/hooks/useUserLocation';
import type { Partner } from '@/types/partner';

import { PLACEHOLDER_SERVICE as PLACEHOLDER_IMG } from '@/lib/images';

export default function FeaturedServicesSection() {
  const { latitude, longitude, hasLocation, permissionStatus } = useUserLocation();

  const { data: partners, isLoading, isError, refetch } = usePartners({
    per_page: 6,
    sort_by: 'created_at',
    latitude: hasLocation ? latitude ?? undefined : undefined,
    longitude: hasLocation ? longitude ?? undefined : undefined,
  });

  const formatDistance = (meters: number): string | undefined => {
    if (!hasLocation || meters <= 0) return undefined;
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <section className="mb-6 sm:mb-10 md:mb-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
          Rekomendasi
        </h2>
        <Button variant="ghost" className="text-[12px] sm:text-[14px] h-auto py-1">
          Lihat Semua
        </Button>
      </div>

      {permissionStatus === 'denied' && (
        <div className="mb-4 flex items-center gap-2 text-[12px] sm:text-[13px] text-[#5b403e] bg-[#fcf9f8] border border-[#e5e2e1] rounded-[4px] px-3 py-2">
          <MapPinOff className="w-4 h-4 flex-shrink-0" />
          <span>Aktifkan lokasi untuk melihat rekomendasi mitra terdekat di sekitar Anda.</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[280px] bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-red-500">Gagal memuat rekomendasi.</p>
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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
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
                location={formatDistance(partner.distance_meters)}
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
