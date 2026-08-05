import { API_URL } from '@/lib/api';

// Pengambil dokumen legal untuk Server Component.
//
// Sejak Fase 5, /terms & /privacy TIDAK lagi menyimpan teksnya di JSX . isinya
// datang dari tabel legal_documents. Itu menutup duplikasi yang sebelumnya
// memaksa setiap perubahan teks legal diterapkan di dua tempat, dan membuat
// tanggal "Terakhir diperbarui" mustahil basi karena diambil dari effective_at.

const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';

export type LegalSlug = 'terms' | 'privacy' | 'partner-terms' | 'cancellation';

export interface LegalDocument {
  id: string;
  slug: LegalSlug;
  version: number;
  title: string;
  summary: string;
  body_md: string;
  effective_at: string;
}

/**
 * Versi terbit yang sedang berlaku, atau null bila belum ada yang diterbitkan
 * (mis. `partner-terms` yang isinya masih menunggu tinjauan hukum).
 *
 * revalidate 300 detik: dokumen legal jarang berubah, tapi saat admin
 * menerbitkan versi baru halaman tidak boleh tertahan lama.
 */
export async function getLegalDocument(slug: LegalSlug): Promise<LegalDocument | null> {
  try {
    const res = await fetch(`${SERVER_API}/legal/${slug}`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as LegalDocument) ?? null;
  } catch {
    return null;
  }
}

/** "3 Agustus 2026" . untuk baris "Terakhir diperbarui". */
export function formatEffectiveDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
