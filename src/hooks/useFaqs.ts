import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

// FAQ dikelola admin (tabel `faqs`), tidak lagi array di JSX.
// Dikelompokkan per kategori oleh backend dengan urutan tetap mengikuti
// sort_order — jangan mengurutkan ulang di klien.

export interface FaqItem {
  id: string;
  audience: 'CUSTOMER' | 'PARTNER';
  category: string;
  question: string;
  /** Boleh memuat token {{...}}; render lewat renderFaqAnswer(). */
  answer: string;
  sort_order: number;
}

export interface FaqGroup {
  category: string;
  items: FaqItem[];
}

export function useFaqs(
  audience: 'CUSTOMER' | 'PARTNER' = 'CUSTOMER',
  /** Data hasil ambil di server, dipakai sebagai isi awal. */
  initialData?: FaqGroup[],
) {
  return useQuery({
    queryKey: ['faqs', audience],
    staleTime: 10 * 60 * 1000,
    initialData,
    queryFn: async (): Promise<FaqGroup[]> => {
      const res = await fetchAPI<FaqGroup[]>(`/faqs?audience=${audience}`);
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });
}
