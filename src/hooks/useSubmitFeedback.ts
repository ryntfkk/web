import { useMutation } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

export interface FeedbackPayload {
  message: string;
  /** Konteks halaman saat masukan dikirim (opsional). */
  page_path?: string;
}

/**
 * Kirim masukan pengguna ke POST /feedback.
 *
 * Endpoint publik (tamu boleh). Bila user login, `fetchAPI` otomatis melampirkan
 * bearer token → backend menangkap username-nya. Tidak ada cache yang perlu
 * di-invalidate: daftar masukan hanya ada di panel admin.
 */
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async (payload: FeedbackPayload): Promise<void> => {
      const res = await fetchAPI('/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.success) throw new Error(res.message || 'Gagal mengirim masukan');
    },
  });
}
