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

/**
 * Subkategori dari satu kategori utama. Diaktifkan hanya saat parentId ada
 * (mis. drawer terbuka), agar tak fetch berlebihan.
 */
export function useSubcategories(parentId: string | null | undefined) {
  return useQuery({
    queryKey: ['subcategories', parentId],
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Category[]> => {
      const res = await fetchAPI<Category[]>(`/categories/${parentId}/subcategories`);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal memuat subkategori');
      }
      return res.data;
    },
  });
}
