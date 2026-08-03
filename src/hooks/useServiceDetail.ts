import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import type { PartnerReview, ReviewSummary } from '@/hooks/usePartnerProfile';

// ── Types (match backend PublicServiceDetailResponse + PartnerWorkingHour) ─

export interface ServicePhoto {
  id: string;
  photo_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ServiceVariation {
  id: string;
  name: string;
  price: number;
}

export interface ServiceDetail {
  id: string;
  partner_id: string;
  partner_user_id: string;
  partner_name: string;
  /** Badan hukum penerima pembayaran; sama dengan partner_name untuk perorangan. */
  partner_legal_name: string;
  partner_type: 'individual' | 'vendor';
  partner_username: string;
  partner_avatar_url: string;
  partner_avg_rating: number;
  partner_total_reviews: number;
  partner_city: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  name: string;
  description: string;
  price: number;
  included_items: string[];
  excluded_items: string[];
  estimated_duration: number;
  unit: string;
  min_order: number;
  variations: ServiceVariation[] | null;
  photo_url: string;
  photos: ServicePhoto[];
  faqs: { question: string; answer: string }[];
  // Persyaratan yang harus disiapkan pelanggan. Backend sudah me-resolve label
  // (dari katalog atau teks bebas mitra); `code` kosong berarti teks bebas.
  requirements?: ServiceRequirement[];
}

export interface ServiceRequirement {
  code: string;
  label: string;
  hint: string;
  icon: string;
  kind: string;
  note: string;
  is_mandatory: boolean;
}

export interface WorkingHour {
  id: string;
  partner_id: string;
  day_of_week: string;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

// ── Hooks ───────────────────────────────────────────────────────────

/** Fetch a single service's full detail (untuk halaman /services/[id]). */
export function useServiceDetail(serviceId: string) {
  return useQuery({
    queryKey: ['serviceDetail', serviceId],
    queryFn: async (): Promise<ServiceDetail> => {
      const res = await fetchAPI<ServiceDetail>(`/services/${serviceId}`);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal memuat detail layanan');
      }
      return res.data;
    },
    enabled: !!serviceId,
  });
}

/**
 * Ulasan untuk SATU layanan (C2). Bentuk responsnya sama persis dengan ulasan
 * mitra, jadi `ReviewSection` dipakai ulang tanpa adaptor.
 */
export function useServiceReviews(serviceId: string, limit = 5) {
  return useQuery({
    queryKey: ['serviceReviews', serviceId, limit],
    queryFn: async (): Promise<{ reviews: PartnerReview[]; summary: ReviewSummary }> => {
      const res = await fetchAPI<{ reviews: PartnerReview[]; summary: ReviewSummary }>(
        `/services/${serviceId}/reviews?limit=${limit}`,
      );
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal memuat ulasan layanan');
      }
      return res.data;
    },
    enabled: !!serviceId,
  });
}

/** Fetch a partner's public working hours. */
export function usePartnerWorkingHours(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partnerWorkingHours', partnerId],
    queryFn: async (): Promise<WorkingHour[]> => {
      const res = await fetchAPI<WorkingHour[]>(
        `/partners/${partnerId}/working-hours`,
      );
      if (!res.success) {
        throw new Error(res.message || 'Gagal memuat jam kerja mitra');
      }
      return res.data || [];
    },
    enabled: !!partnerId,
  });
}
