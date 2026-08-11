import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

export interface PartnerProfileData {
  id: string;
  user_id: string;
  username: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  service_area: string;
  is_online: boolean;
  avg_rating: number;
  total_reviews: number;
  total_orders: number;
  // SE: wilayah untuk LocalBusiness schema (geotargeting query "[jasa] di [kota]").
  // Koordinat basecamp & address_detail SENGAJA tidak ada di sini: endpoint publik
  // tidak lagi mengirimnya (P0-07) karena itu tempat tinggal mitra perorangan.
  city: string;
  district: string;
  province: string;
  /** Endpoint publik hanya membalas mitra approved, jadi ini selalu true. */
  is_verified: boolean;
  /** Tanggal mitra DISETUJUI (bukan tanggal akun dibuat). Kosong untuk mitra lama. */
  member_since?: string;
  /** Spesialisasi dari kategori layanan aktif. */
  categories?: string[];
  /** Badan hukum penerima pembayaran. Sama dengan `name` untuk perorangan. */
  legal_name: string;
  partner_type: 'individual' | 'vendor';
  entity_form?: string;
  /**
   * Badge responsivitas chat (E9). ADA hanya bila sampel chat mitra cukup .
   * backend menyembunyikannya (bukan mengirim "0%") untuk mitra baru. Label
   * waktu sudah siap-tampil dari backend; kosong bila mitra belum pernah balas.
   */
  response_stats?: {
    response_rate: number; // 0-100
    response_time_label?: string;
  };
}

export interface PartnerServicePhoto {
  id: string;
  photo_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface PartnerServiceVariation {
  id: string;
  name: string;
  price: number;
}

export interface PartnerService {
  id: string;
  partner_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  included_items: string[] | null;
  excluded_items: string[] | null;
  estimated_duration: number;
  unit: string;
  min_order: number;
  variations: PartnerServiceVariation[] | null;
  photos: PartnerServicePhoto[];
  /** Penanda persyaratan wajib (C3); daftarnya hanya di endpoint detail. */
  has_mandatory_requirements?: boolean;
}

export interface PartnerPortfolio {
  id: string;
  partner_id: string;
  photo_url: string;
  caption: string;
}

export interface PartnerReview {
  id: string;
  order_id: string;
  customer_id: string;
  partner_id: string;
  rating: number;
  // SE: per-aspect ratings (nullable . tidak semua review mengisi).
  rating_quality?: number;
  rating_punctuality?: number;
  rating_communication?: number;
  image_urls?: string[];
  /** Balasan mitra atas ulasan ini (batas balas 7 hari sejak ulasan dibuat). */
  partner_response?: { content: string; created_at: string } | null;
  comment: string;
  customer_name: string;
  customer_avatar: string | null;
  created_at: string;
}

export interface ReviewSummary {
  total_reviews: number;
  avg_rating: number;
  count_5: number;
  count_4: number;
  count_3: number;
  count_2: number;
  count_1: number;
}

export const usePartnerProfile = (username: string) => {
  return useQuery({
    queryKey: ['partnerProfile', username],
    queryFn: async () => {
      const res = await fetchAPI<PartnerProfileData>(`/partners/${username}`);
      return res.data;
    },
    enabled: !!username,
  });
};

export const usePartnerServices = (username: string) => {
  return useQuery({
    queryKey: ['partnerServices', username],
    queryFn: async () => {
      const res = await fetchAPI<PartnerService[]>(`/partners/${username}/services`);
      return res.data;
    },
    enabled: !!username,
  });
};

export const usePartnerPortfolios = (username: string) => {
  return useQuery({
    queryKey: ['partnerPortfolios', username],
    queryFn: async () => {
      const res = await fetchAPI<PartnerPortfolio[]>(`/partners/${username}/portfolios`);
      return res.data;
    },
    enabled: !!username,
  });
};

export const usePartnerReviews = (username: string, limit = 10, page = 1) => {
  return useQuery({
    queryKey: ['partnerReviews', username, limit, page],
    queryFn: async () => {
      const res = await fetchAPI<{ reviews: PartnerReview[]; summary: ReviewSummary }>(
        `/partners/${username}/reviews?limit=${limit}&page=${page}`
      );
      return res.data;
    },
    enabled: !!username,
  });
};
