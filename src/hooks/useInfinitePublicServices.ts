import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import type { PublicService } from '@/hooks/usePublicServices';

interface Params {
  /** Jumlah item per halaman. */
  limit?: number;
  /** Lokasi user untuk menghitung jarak ke basecamp mitra. */
  latitude?: number;
  longitude?: number;
}

/**
 * Daftar layanan tanpa batas untuk section "Semua Jasa" di Home . dimuat
 * bertahap saat user menggulir ke bawah (bukan tombol "muat lebih banyak").
 * Offset dihitung dari jumlah item yang SUDAH diterima, bukan page*limit,
 * agar tidak melompat bila backend mengembalikan kurang dari `limit`.
 */
export function useInfinitePublicServices({ limit = 12, latitude, longitude }: Params = {}) {
  return useInfiniteQuery({
    queryKey: ['publicServicesInfinite', { limit, latitude, longitude }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.append('limit', String(limit));
      params.append('offset', String(pageParam));
      if (latitude !== undefined) params.append('lat', String(latitude));
      if (longitude !== undefined) params.append('lon', String(longitude));

      const res = await fetchAPI<PublicService[]>(`/services?${params.toString()}`);
      if (!res.success) throw new Error(res.message || 'Gagal memuat layanan');
      return res.data || [];
    },
    // Halaman terakhir lebih pendek dari limit = sudah habis.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < limit ? undefined : allPages.reduce((n, p) => n + p.length, 0),
    staleTime: 5 * 60 * 1000,
    // P: saat lokasi GPS baru resolve di tengah scroll, queryKey berubah (lat/lon
    // masuk) → tanpa ini list unmount total & balik ke page 1 (hitch + loncatan
    // scroll). Pertahankan kartu lama sampai data query baru tiba.
    placeholderData: (prev) => prev,
  });
}
