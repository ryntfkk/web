import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

/**
 * Jumlah notifikasi belum dibaca . untuk badge lonceng.
 *
 * Sebelum ini titik merah di lonceng TopNavbar dirender TANPA SYARAT
 * (`TopNavbar.tsx`, dua tempat): ia menyala selamanya, termasuk pada akun yang
 * baru dibuat dan pada pengguna yang baru saja membaca semuanya. Badge yang
 * selalu menyala mengajari orang mengabaikannya . dan sesudah itu notifikasi
 * yang benar-benar penting (pembayaran gagal, mitra membatalkan) ikut tak
 * terlihat (audit A3).
 *
 * Endpoint-nya sudah ada sejak lama dan sudah dipakai dashboard mitra lewat
 * fetch manual di dalam `fetchData`; hook ini menjadikannya satu sumber
 * sehingga lonceng pelanggan dan lonceng mitra membaca angka yang sama.
 *
 * Pola & key-nya sejajar dengan `useChatRooms` . lihat catatan di sana.
 */
const KEY = ['notifications-unread-count'];

export function useUnreadNotifications(): number {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  const { data } = useQuery({
    queryKey: KEY,
    enabled: isAuthenticated && !isInitializing,
    // Notifikasi tidak punya kanal realtime seperti chat (yang di-invalidate
    // ChatProvider saat pesan WS masuk), jadi angkanya disegarkan berkala.
    // 60 detik: cukup terasa hidup, tanpa menjadikan lonceng sumber beban.
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<number> => {
      const res = await fetchAPI<{ unread_count?: number }>('/notifications/unread-count');
      if (!res.success || !res.data) {
        // Gagal memuat TIDAK boleh menyalakan badge . itu mengulang bug lama
        // dalam bentuk berbeda. Nol berarti "tidak ada yang perlu ditandai".
        return 0;
      }
      return res.data.unread_count ?? 0;
    },
  });

  return data ?? 0;
}

/**
 * Dipanggil setelah menandai notifikasi terbaca supaya badge langsung turun
 * tanpa menunggu interval berikutnya.
 */
export function useRefreshUnreadNotifications(): () => void {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: KEY });
  };
}
