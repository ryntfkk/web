import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';

// F2 (MITRA-IMPLEMENTATION-PLAN): hook tunggal untuk status verifikasi mitra.
// Backend kirim enum LOWERCASE ('pending'/'approved'/'rejected'); hook
// normalisasi ke UPPERCASE supaya konsumen tidak perlu .toUpperCase() tiap
// tempat. Default fail-closed ke 'PENDING' (bukan 'VERIFIED') — lihat plan §2.
//
// isVerified = true HANYA jika status 'APPROVED'. Dipakai untuk sembunyikan
// tombol hapus/edit data verifikasi di halaman mitra.

export type PartnerVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface PartnerMeResponse {
  verification_status?: string;
}

export function usePartnerVerificationStatus(enabled = true) {
  return useQuery({
    queryKey: ['partner', 'me', 'verification-status'],
    queryFn: async (): Promise<PartnerVerificationStatus> => {
      const res = await fetchAPI<PartnerMeResponse>('/partners/me');
      if (!res.success || !res.data) return 'PENDING';
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
