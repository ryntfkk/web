import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetchAPI<any[]>('/categories');
      if (!res.success) {
        throw new Error(res.message || 'Gagal memuat kategori');
      }
      return res.data;
    },
  });
}
