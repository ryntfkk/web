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
  
  // Use Jakarta coordinates as default for MVP
  const lat = params.latitude || -6.200000;
  const lon = params.longitude || 106.816666;
  
  queryParams.append('lat', lat.toString());
  queryParams.append('lon', lon.toString());
  
  if (params.radius) queryParams.append('radius', params.radius.toString());
  if (params.category_id) queryParams.append('category_id', params.category_id);
  if (params.min_rating) queryParams.append('min_rating', params.min_rating.toString());
  if (params.q) queryParams.append('q', params.q);
  if (params.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());

  const queryString = queryParams.toString();
  const endpoint = `/partners?${queryString}`;

  return useQuery({
    queryKey: ['partners', params],
    queryFn: async () => {
      const res = await fetchAPI<any[]>(endpoint); 
      if (!res.success) {
        throw new Error(res.message || 'Gagal memuat data mitra');
      }
      
      // Parse base64 categories (Go json.Marshal encodes []byte as base64)
      return res.data?.map(partner => {
        if (typeof partner.categories === 'string') {
          try {
            partner.categories = JSON.parse(atob(partner.categories));
          } catch (e) {
            console.error("Failed to parse categories:", e);
          }
        }
        return partner;
      });
    },
  });
}
