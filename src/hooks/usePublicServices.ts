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
}

interface PublicServicesParams {
  limit?: number;
  offset?: number;
  /** Kata kunci pencarian jasa (nama/deskripsi). Bila diisi → /services/search. */
  q?: string;
  /** Filter kota (nama kanonik). '' / undefined = semua kota. */
  city?: string;
}

export function usePublicServices(params: PublicServicesParams = {}) {
  const query = params.q?.trim();
  const isSearch = Boolean(query);

  const queryParams = new URLSearchParams();
  if (isSearch) queryParams.append('q', query!);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.city) queryParams.append('city', params.city);

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
  });
}
