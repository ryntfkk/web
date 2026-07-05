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
  basecamp_lat: number | null;
  basecamp_lon: number | null;
  avg_rating: number;
  total_reviews: number;
  total_orders: number;
}

export interface PartnerServicePhoto {
  id: string;
  photo_url: string;
  is_primary: boolean;
  sort_order: number;
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
  photos: PartnerServicePhoto[];
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
