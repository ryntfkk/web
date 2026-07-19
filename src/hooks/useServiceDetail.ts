import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

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
  partner_name: string;
  partner_username: string;
  partner_avatar_url: string;
  partner_avg_rating: number;
  partner_total_reviews: number;
  partner_city: string;
  category_id: string;
  category_name: string;
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

/** Fetch a single service's full detail (for /services?id=[id] page). */
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
