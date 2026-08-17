import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

/**
 * Hook pesanan berbasis React Query. Semua key berada di bawah prefix ['orders']
 * (list) atau ['order', id] (detail) sehingga ChatProvider bisa meng-invalidate-nya
 * secara realtime saat event WS 'order_status' masuk (backend notify.ToUser) .
 * UI menyegar tanpa reload. Pola & guard-nya sejajar dengan useChatRooms.
 *
 * Generic <T> sengaja default unknown: tiap halaman memakai interface Order/
 * OrderDetail LOKAL-nya sendiri (mis. useCustomerOrders<Order>()), jadi hook ini
 * tak perlu memaksakan satu tipe kanonik.
 */

const PARTNER_PAGE_SIZE = 20;

/** Membuka envelope ganda { data: {...} } yang kadang dikirim /orders/:id. */
function unwrapDetail<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data?: unknown }).data) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

/** Daftar pesanan pelanggan . GET /orders (scope customer). Key ['orders','customer']. */
export function useCustomerOrders<T = unknown>() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  return useQuery({
    queryKey: ['orders', 'customer'],
    enabled: isAuthenticated && !isInitializing,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<T[]> => {
      const res = await fetchAPI<unknown>('/orders', { method: 'GET', credentials: 'include' });
      if (!res.success) throw new Error(res.message || 'Gagal memuat pesanan');
      const d = res.data as unknown;
      if (Array.isArray(d)) return d as T[];
      const nested = (d as { data?: unknown })?.data;
      return Array.isArray(nested) ? (nested as T[]) : [];
    },
  });
}

/** Detail satu pesanan . GET /orders/:id. Key ['order', id]. Dipakai pelanggan & mitra. */
export function useOrderDetail<T = unknown>(orderId: string | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  return useQuery({
    queryKey: ['order', orderId],
    enabled: !!orderId && isAuthenticated && !isInitializing,
    staleTime: 15 * 1000,
    queryFn: async (): Promise<T> => {
      const res = await fetchAPI<unknown>(`/orders/${orderId}`);
      if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat pesanan');
      return unwrapDetail<T>(res.data);
    },
  });
}

export interface PartnerOrderFilters {
  /** 'all' → tanpa filter status_group. */
  statusGroup?: string;
  startDate?: string;
  endDate?: string;
  serviceId?: string;
}

interface PartnerOrderPage<T> {
  items: T[];
  total: number;
}

/**
 * Daftar pesanan mitra . GET /orders?role=partner&page=&limit=&... dengan pagination.
 * useInfiniteQuery (idiomatik v5): "Muat lebih" = fetchNextPage(). Key ['orders','partner', filters].
 * Search dilakukan client-side dari data.pages (nama/no. pesanan/layanan).
 */
export function usePartnerOrders<T = unknown>(filters: PartnerOrderFilters = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const { statusGroup, startDate, endDate, serviceId } = filters;
  return useInfiniteQuery({
    queryKey: ['orders', 'partner', { statusGroup, startDate, endDate, serviceId }],
    enabled: isAuthenticated && !isInitializing,
    staleTime: 30 * 1000,
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<PartnerOrderPage<T>> => {
      const params = new URLSearchParams({
        role: 'partner',
        page: String(pageParam),
        limit: String(PARTNER_PAGE_SIZE),
      });
      if (statusGroup && statusGroup !== 'all') params.set('status_group', statusGroup);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (serviceId) params.set('service_id', serviceId);
      const res = await fetchAPI<unknown>(`/orders?${params.toString()}`, { method: 'GET', credentials: 'include' });
      if (!res.success) throw new Error(res.message || 'Gagal memuat pesanan');
      const items = (Array.isArray(res.data) ? res.data : []) as T[];
      return { items, total: res.pagination?.total ?? items.length };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

export interface OrderCounts {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
}

/** Ringkasan hitungan status pesanan mitra . GET /orders/summary. Key ['orders','partner','counts']. */
export function usePartnerOrderCounts() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  return useQuery({
    queryKey: ['orders', 'partner', 'counts'],
    enabled: isAuthenticated && !isInitializing,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<OrderCounts> => {
      const res = await fetchAPI<Partial<OrderCounts>>('/orders/summary');
      const d = res.data;
      if (!res.success || !d) throw new Error(res.message || 'Gagal memuat ringkasan');
      return {
        total: d.total ?? 0,
        pending: d.pending ?? 0,
        processing: d.processing ?? 0,
        completed: d.completed ?? 0,
        cancelled: d.cancelled ?? 0,
      };
    },
  });
}
