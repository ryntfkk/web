import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  placement: string;
  sort_order: number;
  is_active: boolean;
}

export function useBanners(placement: 'hero' | 'secondary' = 'hero') {
  return useQuery({
    queryKey: ['banners', placement],
    queryFn: async () => {
      const res = await fetchAPI<Banner[]>(`/banners?placement=${placement}`);
      if (!res.success || !res.data) throw new Error(getErrorMessage(res));
      return res.data;
    },
    // Banner jarang berubah, cache agak lama
    staleTime: 5 * 60 * 1000, 
  });
}
