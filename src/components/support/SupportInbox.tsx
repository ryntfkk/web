"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, MessageSquare, Loader2 } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  SupportThread,
  SUPPORT_STATUS_LABEL,
  SUPPORT_TARGET_LABEL,
  createSupportThread,
} from '@/lib/support';

/**
 * Daftar percakapan CS . BADAN halaman saja, tanpa header/latar/kontainer.
 *
 * Kerangkanya sengaja diserahkan ke rute pemanggil: pelanggan membukanya di
 * /bantuan (chrome pelanggan), mitra di /mitra/bantuan/chat (shell mitra).
 * Sebelum pemisahan ini hanya ada SATU rute bercrome pelanggan, sehingga mitra
 * yang menekan "Chat Customer Service" terlempar keluar dari mode mitra .
 * lengkap dengan TopNavbar pelanggan di desktop dan tanpa jalan kembali.
 */
export default function SupportInbox({ basePath }: { basePath: string }) {
  const { isAuthorized } = useRequireAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetchAPI<SupportThread[]>('/reports?limit=50');
      if (!cancelled && res.success && Array.isArray(res.data)) setThreads(res.data);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthorized]);

  const startNewChat = async () => {
    setCreating(true);
    setError(null);
    // Backend mengembalikan thread SUPPORT yang masih terbuka bila ada, jadi
    // menekan tombol ini berkali-kali tidak lagi membuat tumpukan tiket kembar
    // (dan tidak membanjiri alert Telegram admin).
    const id = await createSupportThread({
      category: 'other',
      description: 'Halo CS Posko Jasa, saya butuh bantuan.',
    });
    setCreating(false);
    if (id) router.push(`${basePath}/${id}`);
    else setError('Gagal memulai percakapan. Coba lagi.');
  };

  return (
    <div className="space-y-3">
      <button
        onClick={startNewChat}
        disabled={creating}
        className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-red-dark text-white text-sm font-semibold rounded-lg py-3 disabled:opacity-60"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Mulai Chat Baru dengan CS
      </button>
      {error && <p className="text-xs text-brand-error text-center">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="w-12 h-12 text-brand-gray-100 mb-3" />
          <p className="text-sm text-brand-gray-450">Belum ada percakapan dengan CS.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => {
            const hasUnread = (t.unread_count ?? 0) > 0;
            return (
              <Link
                key={t.id}
                href={`${basePath}/${t.id}`}
                className="block bg-white rounded-lg border border-brand-gray-100 p-3 hover:border-brand-red/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Kotak masuk ini memuat TIGA hal yang lahir dari tabel
                        `reports` yang sama: chat CS, tiket dari halaman pesanan,
                        dan laporan moderasi. Tanpa penanda jenis, laporan
                        "mitra ini menipu" tampil sebagai percakapan CS biasa. */}
                    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-gray-60 text-brand-gray-700">
                      {SUPPORT_TARGET_LABEL[t.target_type] || 'Laporan'}
                    </span>
                    <span
                      className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        SUPPORT_STATUS_COLOR[t.status] || 'bg-brand-red-light text-brand-gray-700'
                      }`}
                    >
                      {SUPPORT_STATUS_LABEL[t.status] || t.status}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] text-brand-gray-450">
                    {formatTime(t.last_message_at || t.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-sm truncate ${
                      hasUnread ? 'font-bold text-brand-gray-900' : 'text-brand-gray-700'
                    }`}
                  >
                    {t.last_message || t.description || 'Percakapan CS'}
                  </p>
                  {hasUnread && (
                    <span className="shrink-0 min-w-[18px] h-[18px] bg-brand-red text-white text-[11px] font-bold flex items-center justify-center rounded-full px-1">
                      {t.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTime(time?: string | null) {
  if (!time) return '';
  const d = new Date(time);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

const SUPPORT_STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-brand-warning-soft text-brand-warning-dark',
  REVIEWING: 'bg-brand-info-soft text-brand-info-dark',
  ACTIONED: 'bg-brand-success-soft text-brand-success-dark',
  DISMISSED: 'bg-brand-red-light text-brand-gray-700',
};
