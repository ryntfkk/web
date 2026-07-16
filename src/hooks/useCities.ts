import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

// Daftar kota yang punya mitra approved — mengisi dropdown filter kota.
export function useCities() {
  return useQuery({
    queryKey: ['partner-cities'],
    queryFn: async (): Promise<string[]> => {
      const res = await fetchAPI<string[]>('/partners/cities');
      if (!res.success || !res.data) return [];
      return Array.isArray(res.data) ? res.data.filter(Boolean) : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
