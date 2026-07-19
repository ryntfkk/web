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

export function isThreadClosed(status: ReportStatus): boolean {
  return status === 'ACTIONED' || status === 'DISMISSED';
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
