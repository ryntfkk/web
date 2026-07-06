import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import type { Category } from '@/types/category';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const res = await fetchAPI<Category[]>('/categories');
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal memuat kategori');
      }
      return res.data;
    },
    // Keep previous data visible while refetching to avoid layout shifts
    placeholderData: (prev) => prev,
  });
}
