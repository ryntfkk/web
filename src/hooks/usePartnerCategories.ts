import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

/**
 * Slot kategori mitra (backend migrasi 000080).
 *
 * ATURAN PRODUK yang tercermin di bentuk hook ini:
 *
 *   Kategori mitra hanya bisa BERTAMBAH atau BERGANTI lewat persetujuan admin.
 *   Mitra sendiri hanya bisa MELEPAS.
 *
 * Karena itu tidak ada `useSetPartnerCategories` di sini . tidak ada endpoint
 * "tulis seluruh daftar", dan menambahkannya berarti membuat jalan pintas yang
 * melewati review.
 */

export type PartnerCategorySource = 'onboarding' | 'request' | 'admin' | 'backfill';

export interface PartnerCategory {
  category_id: string;
  category_name: string;
  category_slug: string;
  icon_url: string;
  /** false = kategori (atau induknya) dinonaktifkan admin → layanan di dalamnya tidak tampil publik. */
  is_visible: boolean;
  evidence_urls: string[];
  source: PartnerCategorySource;
  granted_at: string;
}

export interface CategoryRequest {
  id: string;
  category_id: string;
  category_name: string;
  replaces_category_id: string | null;
  replaces_category_name: string;
  /** 'add' = jumlah kategori naik; 'swap' = tukar (replaces terisi). */
  kind: 'add' | 'swap';
  reason: string;
  evidence_urls: string[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  review_note: string;
  reviewed_at: string | null;
  created_at: string;
}

export interface PartnerCategoriesData {
  categories: PartnerCategory[];
  quota: number;
  used: number;
  partner_type: string;
  /** false saat kategori tinggal satu . tombol Lepas harus hilang, bukan error setelah ditekan. */
  can_release: boolean;
  pending_request: CategoryRequest | null;
}

const KEY = ['partner', 'me', 'categories'];

export function usePartnerCategories(enabled = true) {
  return useQuery({
    queryKey: KEY,
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<PartnerCategoriesData> => {
      const res = await fetchAPI<PartnerCategoriesData>('/partners/me/categories');
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal memuat kategori');
      }
      return res.data;
    },
  });
}

export function useCategoryRequestHistory(enabled = true) {
  return useQuery({
    queryKey: ['partner', 'me', 'category-requests'],
    enabled,
    queryFn: async (): Promise<CategoryRequest[]> => {
      const res = await fetchAPI<CategoryRequest[]>('/partners/me/category-requests');
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal memuat riwayat permintaan');
      }
      return res.data;
    },
  });
}

/** Melepas kategori . SATU-SATUNYA perubahan yang berlaku seketika. */
export function useReleaseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (categoryId: string): Promise<number> => {
      const res = await fetchAPI<{ services_deactivated: number }>(
        `/partners/me/categories/${categoryId}`,
        { method: 'DELETE' },
      );
      if (!res.success) throw new Error(res.message || 'Gagal melepas kategori');
      return res.data?.services_deactivated ?? 0;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      // Daftar layanan ikut berubah: layanan di kategori itu baru dinonaktifkan.
      qc.invalidateQueries({ queryKey: ['partner', 'services'] });
    },
  });
}

export interface CategoryRequestPayload {
  category_id: string;
  /** Diisi saat TUKAR: kategori yang dilepas begitu permintaan disetujui. */
  replaces_category_id?: string;
  reason: string;
  evidence_urls: string[];
}

export function useCreateCategoryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CategoryRequestPayload) => {
      const res = await fetchAPI<CategoryRequest>('/partners/me/category-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.success) throw new Error(res.message || 'Gagal mengirim permintaan');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['partner', 'me', 'category-requests'] });
    },
  });
}

export function useCancelCategoryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetchAPI(`/partners/me/category-requests/${requestId}`, { method: 'DELETE' });
      if (!res.success) throw new Error(res.message || 'Gagal membatalkan permintaan');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['partner', 'me', 'category-requests'] });
    },
  });
}
