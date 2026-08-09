import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

// F2 (MITRA-IMPLEMENTATION-PLAN): hook tunggal untuk status verifikasi mitra.
// Backend kirim enum LOWERCASE ('pending'/'approved'/'rejected'); hook
// normalisasi ke UPPERCASE supaya konsumen tidak perlu .toUpperCase() tiap
// tempat. Default fail-closed ke 'PENDING' (bukan 'VERIFIED') . lihat plan §2.
//
// isVerified = true HANYA jika status 'APPROVED'. Dipakai untuk sembunyikan
// tombol hapus/edit data verifikasi di halaman mitra.

export type PartnerVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * 'NONE' = akun ini TIDAK punya pengajuan mitra sama sekali (404 dari
 * /partners/me). Dibedakan dari 'PENDING' karena keduanya berarti hal yang
 * sangat berbeda bagi shell mitra: 'PENDING' berhak membuka halaman persiapan
 * (F-01), 'NONE' adalah pelanggan biasa yang harus diarahkan pulang.
 *
 * HANYA 404 yang menghasilkan 'NONE'. Error lain (jaringan putus, 500) tetap
 * jatuh ke 'PENDING' . fail-closed seperti sebelumnya, supaya mitra sungguhan
 * tidak terlempar keluar hanya karena satu request gagal.
 */
export type PartnerApplicationStatus = PartnerVerificationStatus | 'NONE';

interface PartnerMeResponse {
  verification_status?: string;
}

export function usePartnerVerificationStatus(enabled = true) {
  return useQuery({
    queryKey: ['partner', 'me', 'verification-status'],
    queryFn: async (): Promise<PartnerApplicationStatus> => {
      const res = await fetchAPI<PartnerMeResponse>('/partners/me');
      if (!res.success || !res.data) {
        return res.status === 404 ? 'NONE' : 'PENDING';
      }
      const raw = (res.data.verification_status ?? 'pending').toUpperCase();
      if (raw === 'APPROVED' || raw === 'REJECTED') return raw;
      return 'PENDING';
    },
    enabled,
    staleTime: 60_000,
    // Fail-closed: error → PENDING (bukan VERIFIED).
    retry: 1,
  });
}

// Helper untuk cek apakah mitra sudah diverifikasi admin.
export function useIsPartnerVerified(enabled = true) {
  const { data } = usePartnerVerificationStatus(enabled);
  return data === 'APPROVED';
}
