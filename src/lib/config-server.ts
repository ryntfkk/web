import { API_URL } from '@/lib/api';
import { FALLBACK_PLATFORM_CONFIG, type PlatformConfig } from '@/hooks/usePlatformConfig';

/**
 * Setelan platform untuk Server Component.
 *
 * Kenapa perlu terpisah dari `usePlatformConfig()`: angka bisnis (komisi, biaya
 * penarikan, harga layanan minimum) diubah admin lewat panel dan HARUS ikut
 * berubah tanpa redeploy Amplify. Bila diambil di klien, angkanya absen dari
 * HTML awal . halaman publik kehilangan angkanya di mata crawler, dan pembaca
 * sempat melihat nilai cadangan berkedip sebelum nilai asli tiba. Diambil di
 * server dengan `revalidate`, angkanya ada di HTML pertama DAN tetap mengikuti
 * perubahan admin (paling lama setelah jendela revalidate lewat).
 *
 * Nilai cadangan dipakai bila /config tak terjangkau . sama seperti hook klien.
 * Konsekuensinya disadari: bila admin sudah menurunkan komisi lalu API mati saat
 * revalidate, halaman menampilkan angka DEFAULT, bukan angka admin. Itu sebabnya
 * cadangannya adalah default yang sama dengan backend, bukan angka karangan.
 */

const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';

export async function getPlatformConfig(revalidate = 600): Promise<PlatformConfig> {
  try {
    const res = await fetch(`${SERVER_API}/config`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate },
    });
    if (!res.ok) return FALLBACK_PLATFORM_CONFIG;
    const json = await res.json();
    return (json?.data as PlatformConfig) ?? FALLBACK_PLATFORM_CONFIG;
  } catch {
    return FALLBACK_PLATFORM_CONFIG;
  }
}
