"use client";

import Link from 'next/link';
import { RefreshCw, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/components/ui/service-card';
import { usePartners } from '@/hooks/usePartners';
import { useUserLocation } from '@/hooks/useUserLocation';
import type { Partner } from '@/types/partner';

import { PLACEHOLDER_SERVICE as PLACEHOLDER_IMG } from '@/lib/images';

export default function TopPartnersSection() {
  const { latitude, longitude, hasLocation, permissionStatus } = useUserLocation();

  // Ada lokasi → urut TERDEKAT; tanpa lokasi → rating tertinggi. Tanpa filter kota.
  const { data: partners, isLoading, isError, refetch } = usePartners({
    per_page: 6,
    sort_by: hasLocation ? 'distance' : 'rating',
    latitude: hasLocation ? latitude ?? undefined : undefined,
    longitude: hasLocation ? longitude ?? undefined : undefined,
  });

  // Build a human-readable distance string ONLY when real coordinates were used
  const formatDistance = (meters: number): string | undefined => {
    if (!hasLocation || meters <= 0) return undefined;
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <section className="mb-8 md:mb-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-brand-gray-900">
          Mitra Terpopuler
        </h2>
        <Link href="/search" className="text-brand-red font-bold text-[12px] sm:text-[14px] hover:bg-brand-red-light px-3 py-1 rounded transition-colors">
          Lihat Semua
        </Link>
      </div>

      {/* Location notice — shown when user denied or hasn't responded yet */}
      {permissionStatus === 'denied' && (
        <div className="mb-4 flex items-center gap-2 text-[12px] sm:text-[13px] text-brand-gray-700 bg-brand-gray-50 border border-brand-gray-100 rounded-xs px-3 py-2">
          <MapPinOff className="w-4 h-4 flex-shrink-0" />
          <span>Aktifkan lokasi untuk melihat rekomendasi mitra terdekat di sekitar Anda.</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[280px] bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-red-500">Gagal memuat mitra terpopuler.</p>
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
        <div className="text-center text-[13px] sm:text-[14px] text-brand-gray-700 py-8">
          Belum ada mitra.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
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
                city={partner.city ?? undefined}
                distance={formatDistance(partner.distance_meters)}
                orderCount={partner.total_orders}
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
