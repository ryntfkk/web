'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePublicServices, type PublicService } from '@/hooks/usePublicServices';
import { useCityFilter } from '@/lib/store/cityFilterStore';
import { useUserLocation } from '@/hooks/useUserLocation';

export const SERVICE_LISTING_PAGE_SIZE = 24;

interface UseServiceListingParams {
  /** Kata kunci pencarian (untuk /search?q=). Kosong/undefined = daftar semua. */
  query?: string;
  /** Filter kategori UUID (untuk /services?category=). */
  category?: string;
  /** Data awal dari SSR (hanya /services). Bila diberikan, dipakai sebagai cache
   *  React Query tanpa refetch selama belum stale. */
  initialServices?: PublicService[];
  /** Jumlah item per halaman. */
  limit?: number;
}

/**
 * Hook bersama untuk daftar layanan . dipakai /services (SSR + hydrate) dan
 * /search (CSR). Mengelola filter kota, rating (client-side), sort, paginasi
 * "muat lebih banyak", dan akumulasi hasil.
 *
 * Catatan: backend belum mendukung param sort/min_rating/min_price (lihat
 * WEB-IMPLEMENTATION-PLAN §7). Sort dikirim ke backend via usePublicServices
 * (no-op server-side saat ini); rating filter diterapkan di sisi klien.
 */
export function useServiceListing({
  query,
  category,
  initialServices,
  limit = SERVICE_LISTING_PAGE_SIZE,
}: UseServiceListingParams) {
  const { city, setCity } = useCityFilter();
  const { latitude, longitude, hasLocation } = useUserLocation();
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('terpopuler');
  const [page, setPage] = useState(1);
  const [allServices, setAllServices] = useState<PublicService[]>(initialServices ?? []);

  const isSearch = Boolean(query?.trim());

  // initialData hanya untuk halaman 1 tanpa filter tambahan (sesuai fetch SSR).
  // Setelah filter berubah, query key beda → tidak ada initialData → fetch normal.
  const hasInitial = Boolean(initialServices?.length) && page === 1;

  const { data: services, isLoading, isError, refetch } = usePublicServices(
    {
      q: isSearch ? query : undefined,
      city: city || undefined,
      category,
      limit,
      offset: (page - 1) * limit,
      sort,
      latitude: hasLocation ? latitude ?? undefined : undefined,
      longitude: hasLocation ? longitude ?? undefined : undefined,
    },
    hasInitial ? { initialData: initialServices } : undefined,
  );

  // Reset paginasi & akumulasi saat filter berubah . TAPI skip pada mount awal
  // agar data SSR (initialServices) tidak terhapus.
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
    setAllServices([]);
  }, [query, city, sort, category]);

  // Akumulasi hasil: halaman 1 menggantikan, halaman berikutnya menambah (dedup by id).
  // Pola yang sama dengan SearchContent lama . setState in effect untuk sinkronisasi
  // hasil query ke state akumulasi. Lihat WEB-IMPLEMENTATION-PLAN §4.2/§4.4 untuk
  // rencana migrasi ke useInfiniteQuery (menghilangkan pola ini).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!services) return;
    if (page === 1) {
      setAllServices(services);
    } else {
      setAllServices((prev) => {
        const newServices = services.filter((s) => !prev.some((p) => p.id === s.id));
        return [...prev, ...newServices];
      });
    }
  }, [services, page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const hasNextPage = services ? services.length >= limit : false;

  // Filter rating diterapkan di sisi klien (backend belum support min_rating).
  const visibleServices = useMemo(
    () => allServices.filter((s) => (s.partner_avg_rating ?? 0) >= minRating),
    [allServices, minRating],
  );

  const loadMore = () => {
    if (isLoading || !hasNextPage) return;
    setPage((p) => p + 1);
  };

  return {
    // Filter state
    city,
    setCity,
    minRating,
    setMinRating,
    sort,
    setSort,
    // Query state
    isLoading,
    isError,
    refetch,
    // Pagination
    page,
    hasNextPage,
    loadMore,
    // Results
    visibleServices,
    isSearch,
  };
}
