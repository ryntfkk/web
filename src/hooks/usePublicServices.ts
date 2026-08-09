import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

export interface PublicService {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_username: string;
  partner_avatar_url: string;
  category_id: string;
  category_name: string;
  name: string;
  description: string;
  price: number;
  included_items: string[];
  excluded_items: string[];
  estimated_duration: number;
  photo_url: string;
  partner_avg_rating: number;
  partner_total_reviews: number;
  partner_city?: string;
  partner_district?: string;
  /** Jarak (meter) dari lokasi user ke basecamp mitra; 0 bila lokasi tak dikirim. */
  distance_meters?: number;
  /** Apakah mitra sedang online/aktif hari ini. */
  partner_is_online?: boolean;
  /** Apakah mitra sudah terverifikasi oleh platform. */
  partner_is_verified?: boolean;
  /** Jumlah pesanan SELESAI untuk layanan ini (social proof di kartu). */
  total_orders?: number;
  /**
   * Layanan menuntut sesuatu yang WAJIB disiapkan pelanggan (C3). Penanda saja .
   * daftarnya hanya ada di endpoint detail, sengaja tidak dibawa query daftar.
   */
  has_mandatory_requirements?: boolean;
}

interface PublicServicesParams {
  limit?: number;
  offset?: number;
  /** Kata kunci pencarian jasa (nama/deskripsi). Bila diisi → /services/search. */
  q?: string;
  /** Filter kota (nama kanonik). '' / undefined = semua kota. */
  city?: string;
  /** Filter kategori (UUID). Dipakai "Layanan serupa" & jelajah kategori. */
  category?: string;
  /** Lokasi user untuk menghitung jarak ke basecamp mitra. */
  latitude?: number;
  longitude?: number;
  sort?: string;
  /**
   * Filter jenis mitra (M2): 'individual' | 'vendor'. Kosong = keduanya.
   * Backend menyaring lewat `sqlc.narg('partner_type')`; nilai di luar dua itu
   * dibalas 0 baris tanpa error, jadi UI tidak perlu memvalidasinya lagi.
   */
  partnerType?: string;
}

interface UsePublicServicesOptions {
  /** Data awal (mis. dari SSR) . dipakai sebagai cache React Query tanpa refetch
   *  selama belum stale. Cocokkan dengan params yang diberikan agar query key-nya
   *  sama dengan fetch SSR yang menghasilkan data ini. */
  initialData?: PublicService[];
  /** staleTime khusus. Bila initialData diberikan, default 5 menit (sama dengan
   *  revalidate) agar tidak langsung refetch saat hydrate. */
  staleTime?: number;
}

export function usePublicServices(
  params: PublicServicesParams = {},
  options?: UsePublicServicesOptions,
) {
  const query = params.q?.trim();
  const isSearch = Boolean(query);

  const queryParams = new URLSearchParams();
  if (isSearch) queryParams.append('q', query!);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.city) queryParams.append('city', params.city);
  if (params.category) queryParams.append('category', params.category);
  if (params.latitude !== undefined) queryParams.append('lat', params.latitude.toString());
  if (params.longitude !== undefined) queryParams.append('lon', params.longitude.toString());
  if (params.partnerType) queryParams.append('partner_type', params.partnerType);

  const base = isSearch ? '/services/search' : '/services';
  const queryString = queryParams.toString();
  const endpoint = `${base}${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['publicServices', params],
    queryFn: async () => {
      const res = await fetchAPI<PublicService[]>(endpoint);
      if (!res.success) {
        throw new Error(res.message || 'Gagal memuat layanan');
      }
      return res.data || [];
    },
    // Pertahankan data lama saat refetch (mis. ganti filter) agar tidak berkedip.
    placeholderData: (prev) => prev,
    initialData: options?.initialData,
    staleTime: options?.staleTime ?? (options?.initialData ? 5 * 60 * 1000 : 0),
  });
}
