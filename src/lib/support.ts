import { fetchAPI } from './api';

export type ReportStatus = 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';

export interface SupportThread {
  id: string;
  target_type: string;
  reason_category: string;
  description?: string | null;
  status: ReportStatus;
  created_at: string;
  last_message_at?: string | null;
  last_message?: string | null;
  unread_count?: number;
}

export interface SupportMessage {
  id: string;
  report_id: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  content: string;
  message_type: string;
  created_at: string;
}

// Label status ramah pengguna untuk thread CS.
export const SUPPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: 'Menunggu dijawab',
  REVIEWING: 'Sedang ditangani',
  ACTIONED: 'Selesai',
  DISMISSED: 'Ditutup',
};

/**
 * Jenis tiket di kotak masuk. Tabel `reports` menampung tiga hal sekaligus .
 * permintaan CS umum, tiket dari halaman pesanan, dan laporan moderasi . dan
 * `GET /reports` mengembalikan ketiganya. Tanpa label ini semuanya tampil
 * sebagai "Percakapan CS" yang sama.
 */
export const SUPPORT_TARGET_LABEL: Record<string, string> = {
  SUPPORT: 'Bantuan CS',
  PARTNER: 'Laporan Mitra',
  SERVICE: 'Laporan Layanan',
  REVIEW: 'Laporan Ulasan',
  CHAT_MESSAGE: 'Laporan Chat',
  USER: 'Laporan Pengguna',
};

export function isThreadClosed(status: ReportStatus): boolean {
  return status === 'ACTIONED' || status === 'DISMISSED';
}

/**
 * Ke mana thread CS dibuka . SATU sumber untuk seluruh aplikasi.
 *
 * Kotak masuknya sama (tabel `reports` yang sama, endpoint yang sama); yang
 * berbeda hanya kerangkanya. Mengirim mitra ke `/bantuan` mengeluarkannya dari
 * mode mitra: TopNavbar pelanggan muncul di desktop dan tombol kembalinya
 * hilang. Setiap tempat yang membuat thread WAJIB lewat sini . dulu ada lima
 * `router.push('/bantuan/...')` yang di-hardcode dan semuanya salah untuk mitra.
 */
export function supportBasePath(activeRole?: string | null): string {
  return activeRole === 'partner' ? '/mitra/bantuan/chat' : '/bantuan';
}

/**
 * Validasi target navigasi internal (mis. `?from=` yang jadi tombol kembali).
 * Hanya path relatif satu-garis-miring yang lolos . cegah open-redirect ke
 * `//evil.com`, `/\evil`, atau URL absolut yang diselipkan lewat query param.
 * Mengembalikan path bersih (path+query, tanpa hash) atau `null` bila tidak aman.
 */
export function safeInternalPath(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  // Wajib mulai satu '/', bukan '//' atau '/\' (protocol-relative / backslash trick).
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return null;
  // Tolak skema/whitespace tersuntik.
  if (/[\x00-\x1f]/.test(v) || v.includes('://')) return null;
  return v.split('#')[0];
}

// Buat thread CS baru (menggantikan tombol WhatsApp). Untuk laporan moderasi
// yang punya target nyata, kirim targetType/targetId; jika tidak, default SUPPORT.
export async function createSupportThread(input: {
  category: string;
  description: string;
  targetType?: string;
  targetId?: string;
}): Promise<string | null> {
  const res = await fetchAPI<{ id: string }>('/reports', {
    method: 'POST',
    body: JSON.stringify({
      target_type: input.targetType || 'SUPPORT',
      target_id: input.targetId || undefined,
      reason_category: input.category,
      description: input.description,
    }),
  });
  if (res.success && res.data?.id) return res.data.id;
  return null;
}
