import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

export interface FavoriteService {
  favorite_id: string;
  service_id: string;
  service_name: string;
  price: number;
  category_id: string;
  category_name: string;
  partner_id: string;
  partner_name: string;
  partner_username: string;
  photo_url: string;
  created_at: string;
}

export interface FavoritePartner {
  favorite_id: string;
  partner_id: string;
  user_id: string;
  partner_name: string;
  partner_username: string;
  avatar_url: string;
  avg_rating: string | number;
  total_reviews: number;
  created_at: string;
}

export function useFavoriteServices() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['favorites', 'services'],
    enabled: isAuthenticated,
    queryFn: async (): Promise<FavoriteService[]> => {
      const res = await fetchAPI<FavoriteService[]>('/favorites/services');
      if (!res.success || !res.data) return [];
      return res.data;
    },
  });
}

export function useFavoritePartners() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['favorites', 'partners'],
    enabled: isAuthenticated,
    queryFn: async (): Promise<FavoritePartner[]> => {
      const res = await fetchAPI<FavoritePartner[]>('/favorites/partners');
      if (!res.success || !res.data) return [];
      return res.data;
    },
  });
}

// Aksi favorit. partner_id memakai partners.id (bukan users.id), service_id memakai services.id.
export function useFavoritesActions() {
  const qc = useQueryClient();

  const invalidate = (kind: 'services' | 'partners') =>
    qc.invalidateQueries({ queryKey: ['favorites', kind] });

  return {
    addService: async (serviceId: string) => {
      const res = await fetchAPI('/favorites', {
        method: 'POST',
        body: JSON.stringify({ service_id: serviceId }),
      });
      if (res.success) invalidate('services');
      return res;
    },
    removeService: async (serviceId: string) => {
      const res = await fetchAPI(`/favorites/services/${serviceId}`, { method: 'DELETE' });
      if (res.success) invalidate('services');
      return res;
    },
    addPartner: async (partnerId: string) => {
      const res = await fetchAPI('/favorites', {
        method: 'POST',
        body: JSON.stringify({ partner_id: partnerId }),
      });
      if (res.success) invalidate('partners');
      return res;
    },
    removePartner: async (partnerId: string) => {
      const res = await fetchAPI(`/favorites/partners/${partnerId}`, { method: 'DELETE' });
      if (res.success) invalidate('partners');
      return res;
    },
  };
}
