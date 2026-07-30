'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Scale, ShieldCheck, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface DisputeMessage {
  id: string;
  sender_id?: string;
  sender_role: 'customer' | 'partner' | 'admin';
  sender_name: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface DisputeDetail {
  id: string;
  order_id: string;
  status: string;
  dispute_type: string;
  reason: string;
}

const ROLE_LABEL: Record<string, string> = {
  customer: 'Pelanggan',
  partner: 'Mitra',
  admin: 'Admin CS',
};
const OPEN_STATUSES = ['OPEN', 'REVIEWING'];

function formatTime(t: string) {
  return new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function DisputeRoomClient() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params?.id as string;
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();
  const qc = useQueryClient();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const { data: dispute } = useQuery({
    queryKey: ['dispute', disputeId],
    enabled: isAuthorized && !!disputeId,
    queryFn: async () => {
      const res = await fetchAPI<DisputeDetail>(`/disputes/${disputeId}`);
      if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat sengketa');
      return res.data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ['dispute-messages', disputeId],
    enabled: isAuthorized && !!disputeId,
    refetchInterval: 5000, // polling ringan — sengketa lebih jarang dari chat biasa
    queryFn: async () => {
      const res = await fetchAPI<DisputeMessage[]>(`/disputes/${disputeId}/messages`);
      if (!res.success) throw new Error(res.message || 'Gagal memuat pesan');
      return res.data ?? [];
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isOpen = dispute ? OPEN_STATUSES.includes(dispute.status) : true;

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setErr('');
    const res = await fetchAPI<DisputeMessage>(`/disputes/${disputeId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: input.trim(), message_type: 'text' }),
    });
    setSending(false);
    if (res.success) {
      setInput('');
      qc.invalidateQueries({ queryKey: ['dispute-messages', disputeId] });
    } else {
      setErr(res.message || 'Gagal mengirim pesan');
    }
  };

  if (authLoading) {
    return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-red" /></div>;
  }
  if (!isAuthorized) return null;

  return (
    <div className="flex flex-col h-[100dvh] lg:h-[calc(100dvh-4rem)] bg-brand-gray-60">
      {/* Header */}
      <div className="bg-white border-b border-brand-gray-100 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-brand-gray-60 rounded" aria-label="Kembali">
            <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
          </button>
          <div className="w-9 h-9 rounded-full bg-brand-error-soft flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-brand-red" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-brand-gray-900 leading-tight">Ruang Sengketa</h1>
            <p className="text-xs text-brand-gray-450">
              {dispute ? (isOpen ? 'Sedang ditinjau tim CS' : 'Sengketa ditutup') : 'Memuat…'}
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-brand-info-soft border-b border-brand-info-light px-4 py-2 shrink-0">
        <p className="text-xs text-brand-info-dark max-w-lg mx-auto flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          Ruang ini berisi <strong>Anda, pihak lawan, dan Admin CS</strong>. Jelaskan masalahnya dengan jelas & sertakan bukti agar cepat diselesaikan.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-lg mx-auto w-full">
        {!messages ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-red" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-brand-gray-450 py-10">Belum ada pesan.</p>
        ) : (
          messages.map((m) => {
            const isMe = !!m.sender_id && m.sender_id === user?.id;
            const isAdmin = m.sender_role === 'admin';
            return (
              <div key={m.id} className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <span className={`text-[10px] font-semibold mb-0.5 px-1 ${isAdmin ? 'text-brand-warning' : 'text-brand-gray-450'}`}>
                  {isMe ? 'Anda' : ROLE_LABEL[m.sender_role] || m.sender_name}
                  {isAdmin && ' • Resmi'}
                </span>
                <div
                  className={`px-3.5 py-2 rounded-2xl shadow-sm text-[14px] leading-relaxed ${
                    isMe
                      ? 'bg-brand-red text-white rounded-br-sm'
                      : isAdmin
                        ? 'bg-brand-warning-light border border-brand-warning-border text-brand-warning-dark rounded-bl-sm'
                        : 'bg-white border border-brand-gray-100 text-brand-gray-900 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
                <span className="text-[10px] text-brand-gray-450 mt-0.5">{formatTime(m.created_at)}</span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-brand-gray-100 mt-auto shrink-0 pb-[env(safe-area-inset-bottom)]">
        {!isOpen ? (
          <div className="p-4 text-center max-w-lg mx-auto">
            <p className="text-sm text-brand-gray-450 font-medium">Sengketa ini sudah ditutup. Kotak pesan dinonaktifkan.</p>
          </div>
        ) : (
          <div className="p-3 max-w-lg mx-auto">
            {err && <div className="text-xs text-brand-error px-2 mb-2 font-medium">{err}</div>}
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-brand-gray-60 border border-brand-gray-100 rounded-2xl flex items-center pr-1 overflow-hidden focus-within:border-brand-red">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ketik pesan untuk CS & pihak lawan…"
                  className="w-full bg-transparent p-3 text-base sm:text-sm text-brand-gray-900 focus:outline-none resize-none max-h-32"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className={`p-2 rounded-xl shrink-0 ${input.trim() ? 'bg-brand-red text-white hover:bg-brand-red-dark' : 'text-brand-gray-450'}`}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
