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
    return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#b51822]" /></div>;
  }
  if (!isAuthorized) return null;

  return (
    <div className="flex flex-col h-[100dvh] lg:h-[calc(100dvh-4rem)] bg-[#f7f5f4]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] shrink-0 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded" aria-label="Kembali">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#FFF5F5] flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-[#b51822]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#1c1b1b] leading-tight">Ruang Sengketa</h1>
            <p className="text-xs text-[#9e8e8c]">
              {dispute ? (isOpen ? 'Sedang ditinjau tim CS' : 'Sengketa ditutup') : 'Memuat…'}
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-[#EBF8FF] border-b border-[#BEE3F8] px-4 py-2 shrink-0">
        <p className="text-xs text-[#2A6296] max-w-lg mx-auto flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          Ruang ini berisi <strong>Anda, pihak lawan, dan Admin CS</strong>. Jelaskan masalahnya dengan jelas & sertakan bukti agar cepat diselesaikan.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-lg mx-auto w-full">
        {!messages ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#b51822]" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-[#9e8e8c] py-10">Belum ada pesan.</p>
        ) : (
          messages.map((m) => {
            const isMe = !!m.sender_id && m.sender_id === user?.id;
            const isAdmin = m.sender_role === 'admin';
            return (
              <div key={m.id} className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <span className={`text-[10px] font-semibold mb-0.5 px-1 ${isAdmin ? 'text-[#D69E2E]' : 'text-[#9e8e8c]'}`}>
                  {isMe ? 'Anda' : ROLE_LABEL[m.sender_role] || m.sender_name}
                  {isAdmin && ' • Resmi'}
                </span>
                <div
                  className={`px-3.5 py-2 rounded-2xl shadow-sm text-[14px] leading-relaxed ${
                    isMe
                      ? 'bg-[#b51822] text-white rounded-br-sm'
                      : isAdmin
                        ? 'bg-[#FEFCBF] border border-[#F6E05E] text-[#744210] rounded-bl-sm'
                        : 'bg-white border border-[#e5e2e1] text-[#1c1b1b] rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
                <span className="text-[10px] text-[#9e8e8c] mt-0.5">{formatTime(m.created_at)}</span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-[#e5e2e1] mt-auto shrink-0 pb-[env(safe-area-inset-bottom)]">
        {!isOpen ? (
          <div className="p-4 text-center max-w-lg mx-auto">
            <p className="text-sm text-[#9e8e8c] font-medium">Sengketa ini sudah ditutup. Kotak pesan dinonaktifkan.</p>
          </div>
        ) : (
          <div className="p-3 max-w-lg mx-auto">
            {err && <div className="text-xs text-[#E53E3E] px-2 mb-2 font-medium">{err}</div>}
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-[#f7f5f4] border border-[#e5e2e1] rounded-2xl flex items-center pr-1 overflow-hidden focus-within:border-[#b51822]">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ketik pesan untuk CS & pihak lawan…"
                  className="w-full bg-transparent p-3 text-base sm:text-sm text-[#1c1b1b] focus:outline-none resize-none max-h-32"
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
                  className={`p-2 rounded-xl shrink-0 ${input.trim() ? 'bg-[#b51822] text-white hover:bg-[#90121a]' : 'text-[#9e8e8c]'}`}
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
