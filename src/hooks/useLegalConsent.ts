import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

// Persetujuan S&K yang TERIKAT VERSI.
//
// Mencatat sekadar "user sudah setuju" tidak menjawab pertanyaan yang muncul di
// pengadilan: setuju teks yang mana. Karena itu klien mengambil id versi yang
// sedang berlaku lebih dulu, lalu mengirim id itu saat mencatat persetujuan.
// Lihat PLAN-KONTEN-LEGAL-CMS.md §5.5.

export interface LegalDocument {
  id: string;
  slug: 'terms' | 'privacy' | 'partner-terms' | 'cancellation';
  version: number;
  title: string;
  summary: string;
  effective_at: string;
}

export function useActiveLegalDocuments() {
  return useQuery({
    queryKey: ['legal-active'],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<LegalDocument[]> => {
      const res = await fetchAPI<LegalDocument[]>('/legal/active');
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });
}

/**
 * Catat persetujuan untuk slug tertentu. Dipanggil TEPAT SETELAH registrasi
 * berhasil, saat token sudah ada.
 *
 * Sengaja tidak melempar error: registrasi sudah terlanjur berhasil, dan
 * menggagalkan alur di titik ini hanya membuat pengguna terjebak di halaman
 * daftar dengan akun yang sebenarnya sudah jadi. Kegagalan dilaporkan lewat
 * nilai balik agar pemanggil bisa mencatatnya.
 */
export async function recordLegalConsent(
  docs: LegalDocument[],
  slugs: LegalDocument['slug'][],
): Promise<boolean> {
  const ids = docs.filter((d) => slugs.includes(d.slug)).map((d) => d.id);
  if (ids.length === 0) return false;

  const res = await fetchAPI('/legal/accept', {
    method: 'POST',
    body: JSON.stringify({ document_ids: ids }),
  });
  return res.success;
}
