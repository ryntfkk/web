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
 * Catatan: endpoint publik menerima `q, limit, offset, city, partner_type,
 * min_price, max_price, lat, lon`. `sort` dan `min_rating` masih TIDAK dikenal
 * backend, jadi pengurutan & filter rating dikerjakan di KLIEN atas hasil yang
 * sudah dimuat (lihat catatan panjang di `comparator` di bawah untuk batasannya).
 *
 * Filter HARGA (E5) kini disaring di SERVER (`min_price`/`max_price`), sama
 * seperti `partnerType`: menyaring di klien akan membuang sebagian dari 24 item
 * yang sudah diambil sehingga halaman jadi setengah kosong dan "muat lebih
 * banyak" melewatkan hasil.
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
  // Arah urut . hanya bermakna untuk 'harga'. Menekan "Harga" berulang
  // membalik arahnya; chevron di SortBar sekarang benar-benar menunjukkannya.
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // M2: '' = semua, 'individual' = perorangan, 'vendor' = badan usaha.
  // Difilter di SERVER (bukan client) supaya paginasi tetap benar . menyaring
  // 24 item yang sudah terlanjur diambil akan menghasilkan halaman setengah
  // kosong dan "muat lebih banyak" yang melewatkan hasil.
  const [partnerType, setPartnerType] = useState('');
  // Filter harga (E5) . disaring SERVER, lihat catatan di kepala berkas. 0 = tak
  // dibatasi. Disimpan sebagai number; UI mengoper string input via setter.
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
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
      // `sort` TIDAK dikirim: endpoint tidak mengenalnya, dan menyertakannya
      // hanya mengubah queryKey React Query → refetch sia-sia dengan URL yang
      // persis sama. Pengurutan dikerjakan di klien (lihat `comparator`).
      partnerType: partnerType || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
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
    // `sort`/`sortDir` sengaja TIDAK di sini: pengurutan dikerjakan di klien
    // atas hasil yang sudah dimuat, jadi mengubahnya tidak perlu memuat ulang
    // dari halaman 1 (dan membuang hasil yang sudah ada). `minPrice`/`maxPrice`
    // JUSTRU di sini: keduanya disaring server, jadi ganti harga = query baru.
  }, [query, city, category, partnerType, minPrice, maxPrice]);

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

  /**
   * Pengurutan . DIKERJAKAN DI KLIEN, dan itu memang perlu disebutkan.
   *
   * Sampai 2026-08-11 SortBar adalah kontrol MATI: `sort` diterima
   * `usePublicServices` sebagai parameter tetapi tidak pernah ditambahkan ke
   * query string (tidak ada `queryParams.append('sort', …)`), dan tidak ada
   * pengurutan di klien juga. Keempat tombolnya berganti sorotan lalu tidak
   * mengubah apa pun. Endpoint `/services/search` memang hanya menerima
   * `q, limit, offset, city, partner_type, lat, lon`.
   *
   * ⚠️ BATASNYA: yang diurutkan adalah hasil yang SUDAH DIMUAT, bukan seluruh
   * katalog. Dengan "Muat Lebih Banyak", "termurah" berarti termurah di antara
   * yang tampil. Perbaikan sesungguhnya adalah ORDER BY di backend; sampai itu
   * ada, kontrol yang mengurutkan sebagian tetap jauh lebih jujur daripada
   * kontrol yang tidak mengurutkan apa pun.
   *
   * `terbaru` sengaja tanpa pembanding: backend sudah `ORDER BY created_at DESC`
   * dan `PublicService` tidak membawa `created_at`, jadi urutan API ITULAH
   * "terbaru" . mengurut ulang justru akan merusaknya.
   */
  const comparator = useMemo(() => {
    switch (sort) {
      case 'harga':
        return (a: PublicService, b: PublicService) =>
          sortDir === 'asc' ? a.price - b.price : b.price - a.price;
      case 'terlaris':
        return (a: PublicService, b: PublicService) => (b.total_orders ?? 0) - (a.total_orders ?? 0);
      case 'terpopuler':
        return (a: PublicService, b: PublicService) =>
          (b.partner_avg_rating ?? 0) - (a.partner_avg_rating ?? 0) ||
          (b.partner_total_reviews ?? 0) - (a.partner_total_reviews ?? 0);
      default:
        return null;
    }
  }, [sort, sortDir]);

  // Filter rating diterapkan di sisi klien (backend belum support min_rating).
  const visibleServices = useMemo(() => {
    const filtered = allServices.filter((s) => (s.partner_avg_rating ?? 0) >= minRating);
    // `slice()` dulu . `sort` memutasi array di tempat, dan `allServices` adalah
    // state React yang tidak boleh disentuh langsung.
    return comparator ? filtered.slice().sort(comparator) : filtered;
  }, [allServices, minRating, comparator]);

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
    sortDir,
    setSortDir,
    partnerType,
    setPartnerType,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
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
