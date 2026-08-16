"use client";

import { useEffect, useMemo, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import { useInfinitePublicServices } from '@/hooks/useInfinitePublicServices';
import { useUserLocation } from '@/hooks/useUserLocation';

/**
 * "Semua Layanan" . katalog panjang di bagian bawah Home. Halaman awal dimuat
 * otomatis saat sentinel masuk viewport (gulir ke bawah). Setelah AUTO_PAGES
 * halaman, auto-fetch BERHENTI dan berganti tombol "Muat lebih banyak": tanpa
 * batas ini DOM tumbuh tak terbatas (kartu tak pernah di-unmount) sehingga tiap
 * frame scroll makin berat . inilah gejala "makin ke bawah makin lelet".
 */
const AUTO_PAGES = 4;

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

  const pageCount = data?.pages.length ?? 0;
  // Auto-fetch hanya sampai AUTO_PAGES halaman; sesudahnya pakai tombol manual.
  const autoLoad = hasNextPage && pageCount < AUTO_PAGES;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !autoLoad) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      // Mulai memuat sebelum sentinel terlihat agar mulus (200px, bukan 400px:
      // 400px terlalu agresif → pre-fetch berlebihan menumpuk DOM lebih cepat).
      { rootMargin: '200px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoLoad, isFetchingNextPage, fetchNextPage]);

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
          {/* P: content-visibility:auto membuat browser melewati layout/paint
              kartu di luar viewport → biaya per-frame scroll tetap ringan walau
              list panjang. contain-intrinsic-size ~ tinggi kartu agar scrollbar
              tidak melompat saat subtree off-screen di-skip. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 [&>*]:[content-visibility:auto] [&>*]:[contain-intrinsic-size:0_300px]">
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

          {/* Sentinel gulir . memicu halaman berikutnya (hanya sampai AUTO_PAGES) */}
          <div ref={sentinelRef} aria-hidden className="h-px" />

          {/* Setelah batas auto-load, lanjut manual agar DOM tak tumbuh tanpa henti. */}
          {hasNextPage && !autoLoad && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-[13px] px-5"
              >
                {isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
              </Button>
            </div>
          )}

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
