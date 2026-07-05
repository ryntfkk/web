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
}

interface PublicServicesParams {
  limit?: number;
  offset?: number;
}

export function usePublicServices(params: PublicServicesParams = {}) {
  const queryParams = new URLSearchParams();

  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = `/services${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['publicServices', params],
    queryFn: async () => {
      const res = await fetchAPI<PublicService[]>(endpoint);
      if (!res.success) {
        throw new Error(res.message || 'Gagal memuat layanan');
      }
      return res.data || [];
    },
  });
}
