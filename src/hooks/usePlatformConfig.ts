import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

// Setelan platform LIVE dari `platform_settings` di DB (endpoint publik
// `GET /config`). Admin bisa mengubah komisi/tarif/batas kapan saja lewat
// panel — tanpa hook ini, web menampilkan angka lama sampai deploy ulang
// Amplify. Angka bisnis DILARANG diketik langsung di JSX; lihat
// PLAN-KONTEN-LEGAL-CMS.md §5.1.
export interface PlatformConfig {
  base_transport_fee: number;
  transport_fee_per_km: number;
  admin_fee: number;
  /** Pecahan, bukan persen: 0.12 = 12%. Pakai formatFeeRate() untuk teks. */
  platform_fee_rate: number;
  min_transaction: number;
  withdrawal_fee: number;
  max_withdrawal: number;
  max_wallet_adjustment: number;
  /** Plafon total per item biaya tambahan yang boleh diajukan mitra. */
  max_additional_fee: number;
  /**
   * Identitas & kontak platform. Setiap field boleh kosong — tampilkan secara
   * KONDISIONAL, jangan cetak "-": itu memberi kesan datanya ada tapi hilang.
   * Absen sama sekali bila profil gagal dibaca.
   */
  profile?: PlatformProfile;
}

export interface PlatformProfile {
  legal_name: string;
  brand_name: string;
  business_id: string;
  address: string;
  support_email: string;
  support_phone: string;
  support_whatsapp: string;
  dpo_email: string;
  withdrawal_sla: string;
  /**
   * SLA verifikasi mitra. KOSONG = tidak ada janji waktu — UI wajib memakai copy
   * netral, bukan mengarang tenggat (P1-15).
   */
  verification_sla?: string;
}

// Cadangan saat /config gagal dimuat — selaras DefaultPlatformSettings di
// backend/internal/config/config.go. Ini SATU-SATUNYA tempat angka ini boleh
// muncul sebagai literal di web.
export const FALLBACK_PLATFORM_CONFIG: PlatformConfig = {
  base_transport_fee: 0,
  transport_fee_per_km: 3000,
  admin_fee: 2000,
  platform_fee_rate: 0.12,
  min_transaction: 50000,
  withdrawal_fee: 3000,
  max_withdrawal: 10000000,
  max_wallet_adjustment: 5000000,
  max_additional_fee: 10000000,
};

/**
 * Setelan platform, tak pernah undefined — mengembalikan cadangan selama
 * fetch berjalan atau bila gagal, sehingga pemanggil tidak perlu menangani
 * state kosong (dan tidak tergoda menulis `?? 0.12` sendiri).
 */
export function usePlatformConfig(): PlatformConfig {
  const { data } = useQuery({
    queryKey: ['platform-config'],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<PlatformConfig> => {
      const res = await fetchAPI<PlatformConfig>('/config');
      if (!res.success || !res.data) return FALLBACK_PLATFORM_CONFIG;
      return res.data;
    },
  });
  return data ?? FALLBACK_PLATFORM_CONFIG;
}

/** 0.12 → "12%". Menghindari sisa desimal float (0.125 → "12,5%"). */
export function formatFeeRate(rate: number): string {
  const pct = rate * 100;
  const rounded = Math.round(pct * 100) / 100;
  return `${rounded.toLocaleString('id-ID')}%`;
}
