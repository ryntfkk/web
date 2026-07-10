import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

export interface NotificationPreference {
  id: string;
  user_id: string;
  category: string;
  push_enabled: boolean;
  email_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotificationPreferences() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['notification-preferences'],
    enabled: isAuthenticated,
    queryFn: async (): Promise<NotificationPreference[]> => {
      const res = await fetchAPI<NotificationPreference[]>('/notifications/preferences');
      if (!res.success || !res.data) return [];
      return res.data;
    },
  });
}

export function useUpsertPreference() {
  const qc = useQueryClient();
  return async (category: string, pushEnabled: boolean, emailEnabled: boolean) => {
    await fetchAPI('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        category,
        push_enabled: pushEnabled,
        email_enabled: emailEnabled,
      }),
    });
    qc.invalidateQueries({ queryKey: ['notification-preferences'] });
  };
}
