"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, MessageSquare, LifeBuoy, Loader2 } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  SupportThread,
  SUPPORT_STATUS_LABEL,
  createSupportThread,
} from '@/lib/support';

function formatTime(time?: string | null) {
  if (!time) return '';
  const d = new Date(time);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

const statusColor: Record<string, string> = {
  OPEN: 'bg-[#FFFBEB] text-[#744210]',
  REVIEWING: 'bg-[#EBF8FF] text-[#2A6296]',
  ACTIONED: 'bg-[#F0FFF4] text-[#276749]',
  DISMISSED: 'bg-[#f0eded] text-[#5b403e]',
};

export default function SupportListPage() {
  const { isAuthorized } = useRequireAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
    const id = await createSupportThread({
      category: 'other',
      description: 'Halo CS Posko Jasa, saya butuh bantuan.',
    });
    setCreating(false);
    if (id) router.push(`/bantuan/${id}`);
  };

  return (
    <div className="min-h-[100dvh] bg-[#f7f5f4]">
      {/* Header */}
      <MobilePageHeader
        title="Chat Customer Service"
        icon={<LifeBuoy className="w-5 h-5 text-[#b51822]" />}
      />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        <h1 className="hidden lg:flex items-center gap-2 text-xl font-bold text-[#1c1b1b]">
          <LifeBuoy className="w-5 h-5 text-[#b51822]" /> Chat Customer Service
        </h1>
        <button
          onClick={startNewChat}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 bg-[#b51822] hover:bg-[#90121a] text-white text-sm font-semibold rounded-lg py-3 disabled:opacity-60"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Mulai Chat Baru dengan CS
        </button>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-12 h-12 text-[#e5e2e1] mb-3" />
            <p className="text-sm text-[#9e8e8c]">Belum ada percakapan dengan CS.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => {
              const hasUnread = (t.unread_count ?? 0) > 0;
              return (
                <Link
                  key={t.id}
                  href={`/bantuan/${t.id}`}
                  className="block bg-white rounded-lg border border-[#e5e2e1] p-3 hover:border-[#b51822]/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        statusColor[t.status] || 'bg-[#f0eded] text-[#5b403e]'
                      }`}
                    >
                      {SUPPORT_STATUS_LABEL[t.status] || t.status}
                    </span>
                    <span className="text-[11px] text-[#9e8e8c]">
                      {formatTime(t.last_message_at || t.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm truncate ${
                        hasUnread ? 'font-bold text-[#1c1b1b]' : 'text-[#5b403e]'
                      }`}
                    >
                      {t.last_message || t.description || 'Percakapan CS'}
                    </p>
                    {hasUnread && (
                      <span className="shrink-0 min-w-[18px] h-[18px] bg-[#b51822] text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1">
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
    </div>
  );
}
