"use client";

import Link from 'next/link';
import { RefreshCw, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/components/ui/service-card';
import { usePartners } from '@/hooks/usePartners';
import { useUserLocation } from '@/hooks/useUserLocation';
import type { Partner } from '@/types/partner';

import { PLACEHOLDER_SERVICE as PLACEHOLDER_IMG } from '@/lib/images';

// Mode geser (horizontal), bukan grid menurun . lebar kartu dikunci agar
// kartu berikutnya "mengintip" di tepi layar sebagai isyarat bisa digeser.
const SCROLLER_CLASS =
  'flex gap-3 md:gap-4 overflow-x-auto snap-x scrollbar-hide pb-1 -mx-3 px-3 sm:-mx-1 sm:px-1';
const ITEM_CLASS = 'flex-shrink-0 snap-start w-[42vw] max-w-[190px] sm:w-44 lg:w-48';

export default function TopPartnersSection() {
  const { latitude, longitude, hasLocation, permissionStatus } = useUserLocation();

  // Ada lokasi → urut TERDEKAT; tanpa lokasi → rating tertinggi. Tanpa filter kota.
  const { data: partners, isLoading, isError, refetch } = usePartners({
    per_page: 12,
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
    <section className="mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-brand-gray-900">
          Mitra Terpopuler
        </h2>
        <Link href="/services" className="text-brand-red font-bold text-[12px] sm:text-[14px] hover:bg-brand-red-light px-3 py-1 rounded transition-colors">
          Lihat Semua
        </Link>
      </div>

      {/* Location notice . shown when user denied or hasn't responded yet */}
      {permissionStatus === 'denied' && (
        <div className="mb-4 flex items-center gap-2 text-[12px] sm:text-[13px] text-brand-gray-700 bg-brand-gray-50 border border-brand-gray-100 rounded-xs px-3 py-2">
          <MapPinOff className="w-4 h-4 flex-shrink-0" />
          <span>Aktifkan lokasi untuk melihat rekomendasi mitra terdekat di sekitar Anda.</span>
        </div>
      )}

      {isLoading ? (
        <div className={SCROLLER_CLASS} style={{ WebkitOverflowScrolling: 'touch' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${ITEM_CLASS} h-[280px] bg-brand-gray-100 animate-pulse rounded-lg`} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-brand-error">Gagal memuat mitra terpopuler.</p>
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
        <div className={SCROLLER_CLASS} style={{ WebkitOverflowScrolling: 'touch' }}>
          {partners?.map((partner: Partner) => (
            <Link key={partner.id} href={`/${partner.username}`} className={`${ITEM_CLASS} block`}>
              <ServiceCard
                vendorName={partner.name}
                category={partner.categories?.[0]?.name || 'Umum'}
                rating={partner.avg_rating}
                reviewCount={partner.total_reviews}
                price={partner.starting_price}
                unit="Layanan"
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
