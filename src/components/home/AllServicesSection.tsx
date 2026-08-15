"use client";

import { useEffect, useMemo, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import { useInfinitePublicServices } from '@/hooks/useInfinitePublicServices';
import { useUserLocation } from '@/hooks/useUserLocation';

/**
 * "Semua Layanan" . katalog panjang di bagian bawah Home. Halaman berikutnya
 * dimuat otomatis saat sentinel masuk viewport (gulir ke bawah), tanpa tombol.
 */
export default function AllServicesSection() {
  const { latitude, longitude, hasLocation } = useUserLocation();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePublicServices({
    limit: 12,
    latitude: hasLocation ? latitude ?? undefined : undefined,
    longitude: hasLocation ? longitude ?? undefined : undefined,
  });

  // Dedup by id . offset bisa menggeser bila katalog berubah saat digulir.
  const services = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages.flat() ?? []).filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [data]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      // Mulai memuat sebelum sentinel benar-benar terlihat agar terasa mulus.
      { rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <section className="mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-brand-gray-900">
          Semua Layanan
        </h2>
      </div>

      {isError && services.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-brand-error">Gagal memuat layanan.</p>
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {services.map((service) => (
              <ServiceProductCard key={service.id} service={service} />
            ))}
            {(isLoading || isFetchingNextPage) &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`sk-${i}`} className="h-[280px] bg-brand-gray-100 animate-pulse rounded-lg" />
              ))}
          </div>

          {!isLoading && services.length === 0 && (
            <div className="text-center text-brand-gray-450 py-8">Belum ada layanan tersedia.</div>
          )}

          {/* Sentinel gulir . memicu halaman berikutnya */}
          <div ref={sentinelRef} aria-hidden className="h-px" />

          {!hasNextPage && services.length > 0 && (
            <p className="text-center text-[12px] sm:text-[13px] text-brand-gray-400 py-6">
              Semua layanan sudah ditampilkan.
            </p>
          )}
        </>
      )}
    </section>
  );
}
