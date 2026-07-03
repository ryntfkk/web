import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

interface PartnersParams {
  latitude?: number;
  longitude?: number;
  radius?: number;
  category_id?: string;
  min_rating?: number;
  q?: string;
  sort_by?: string;
  page?: number;
  per_page?: number;
}

export function usePartners(params: PartnersParams = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.latitude) queryParams.append('latitude', params.latitude.toString());
  if (params.longitude) queryParams.append('longitude', params.longitude.toString());
  if (params.radius) queryParams.append('radius', params.radius.toString());
  if (params.category_id) queryParams.append('category_id', params.category_id);
  if (params.min_rating) queryParams.append('min_rating', params.min_rating.toString());
  if (params.q) queryParams.append('q', params.q); // Note: backend doesn't explicitly document 'q', but usually it does.
  if (params.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/partners?${queryString}` : '/partners';

  return useQuery({
    queryKey: ['partners', params],
    queryFn: async () => {
      const res = await fetchAPI<any[]>(endpoint); // Assuming it returns array of partners
      if (!res.success) {
        throw new Error(res.message || 'Gagal memuat data mitra');
      }
      return res.data;
    },
  });
}
