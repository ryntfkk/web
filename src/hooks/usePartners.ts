import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { normalizePartner, type Partner } from '@/types/partner';

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

  // Only send lat/lon when explicitly provided by the caller
  // (e.g. from browser geolocation or user input).
  // Do NOT hardcode a default city — omitting lat/lon lets the backend
  // return results without distance biasing.
  if (params.latitude !== undefined) {
    queryParams.append('lat', params.latitude.toString());
  }
  if (params.longitude !== undefined) {
    queryParams.append('lon', params.longitude.toString());
  }

  if (params.radius) queryParams.append('radius', params.radius.toString());
  if (params.category_id) queryParams.append('category_id', params.category_id);
  if (params.min_rating) queryParams.append('min_rating', params.min_rating.toString());
  if (params.q) queryParams.append('q', params.q);
  if (params.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/partners?${queryString}` : '/partners';

  return useQuery({
    queryKey: ['partners', params],
    queryFn: async (): Promise<Partner[]> => {
      const res = await fetchAPI<Record<string, unknown>[]>(endpoint);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal memuat data mitra');
      }

      // Normalize into strongly-typed Partner objects (immutable spread).
      // Backend now sends clean JSON — normalization just validates types
      // and fills safe defaults for any missing fields.
      return res.data.map((raw) => normalizePartner(raw));
    },
    // Keep previous data visible while refetching to avoid layout shifts
    placeholderData: (prev) => prev,
  });
}
