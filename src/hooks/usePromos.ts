import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

export interface Promo {
  id: string;
  code: string;
  sponsor: 'platform' | 'partner';
  category_id: string | null;
  partner_id: string | null;
  discount_type: 'percentage' | 'fixed';
  value: number;
  max_discount: number | null;
  min_order_amount: number;
  usage_limit: number;
  per_user_limit: number;
  used_count: number;
  reserved_count: number;
  valid_until: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  version: number;
}

export interface PromoValidationResult {
  is_valid: boolean;
  promo: { id: string; code: string; name: string };
  discount: {
    type: string;
    value: number;
    calculated_amount: number;
    final_discount: number;
  };
  summary: {
    original_amount: number;
    discount_amount: number;
    final_amount: number;
  };
  my_usage: { used: number; remaining: number; per_user_limit: number };
}

export function useAvailablePromos(categoryId?: string, minOrder?: number) {
  return useQuery<Promo[]>({
    queryKey: ['promos', 'available', categoryId ?? '', minOrder ?? 0],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryId) params.set('category_id', categoryId);
      if (minOrder) params.set('min_order', String(minOrder));
      const qs = params.toString();
      const res = await fetchAPI<Promo[]>(`/promos${qs ? `?${qs}` : ''}`);
      if (!res.success) throw new Error(res.message || 'Gagal memuat promo');
      return res.data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useValidatePromo() {
  return {
    mutateAsync: async (params: {
      code: string;
      order_amount: number;
      category_id?: string;
      partner_id?: string;
    }) => {
      const res = await fetchAPI<PromoValidationResult>('/promos/validate', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (!res.success) throw new Error(res.message || 'Kode promo tidak valid');
      return res.data;
    },
  };
}
