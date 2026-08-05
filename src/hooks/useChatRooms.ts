import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import type { ChatRoom } from '@/components/chat/ChatRoomList';

/**
 * Daftar room chat via React Query dengan key ['chat-rooms'].
 * PENTING: key ini di-invalidate oleh ChatProvider saat pesan WS masuk .
 * daftar & unread count ter-update realtime tanpa polling.
 */
export function useChatRooms() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  return useQuery({
    queryKey: ['chat-rooms'],
    enabled: isAuthenticated && !isInitializing,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ChatRoom[]> => {
      const res = await fetchAPI<ChatRoom[]>('/chat/rooms');
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal memuat percakapan');
      }
      return res.data;
    },
  });
}

/** Total pesan belum dibaca di semua room . untuk badge launcher chat. */
export function useUnreadChatCount(): number {
  const { data } = useChatRooms();
  return (data ?? []).reduce((sum, r) => sum + (r.unread_count ?? 0), 0);
}
