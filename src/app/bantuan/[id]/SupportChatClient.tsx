"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, LifeBuoy } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SupportMessage } from '@/lib/support';

const POLL_MS = 7000;

export default function SupportChatClient({ reportId }: { reportId: string }) {
  const { isAuthorized } = useRequireAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetchAPI<SupportMessage[]>(`/reports/${reportId}/messages`);
    if (res.success && Array.isArray(res.data)) {
      setMessages(res.data);
    }
    setLoading(false);
  }, [reportId]);

  // Muat awal + polling (tanpa WebSocket untuk MVP).
  useEffect(() => {
    if (!isAuthorized) return;
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [isAuthorized, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    const res = await fetchAPI<SupportMessage>(`/reports/${reportId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, message_type: 'text' }),
    });
    setSending(false);
    if (res.success && res.data) {
      setInput('');
      setMessages((prev) => [...prev, res.data as SupportMessage]);
    } else {
      setError(res.message || 'Gagal mengirim pesan.');
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f7f5f4]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] shrink-0 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => router.push('/bantuan')} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#FDECEC] flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-[#b51822]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#1c1b1b] leading-tight">Customer Service</h1>
              <p className="text-[11px] text-[#9e8e8c]">Posko Jasa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Send className="w-8 h-8 text-[#e5e2e1] mb-3" />
            <p className="text-sm text-[#9e8e8c]">Mulai percakapan dengan tim CS kami.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_type === 'user';
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {!isMe && <span className="text-[10px] text-[#9e8e8c] mb-0.5 px-1">{m.sender_name || 'CS'}</span>}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl shadow-sm ${
                    isMe
                      ? 'bg-[#b51822] text-white rounded-br-sm'
                      : 'bg-white border border-[#e5e2e1] text-[#1c1b1b] rounded-bl-sm'
                  }`}
                >
                  {m.message_type === 'image' ? (
                    <a href={m.content} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.content} alt="Lampiran" className="max-w-full max-h-64 rounded" />
                    </a>
                  ) : (
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                <span className="text-[10px] text-[#9e8e8c] mt-1 px-1">
                  {new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-[#e5e2e1] shrink-0 pb-[env(safe-area-inset-bottom)]">
        <form onSubmit={send} className="p-3 max-w-lg mx-auto flex flex-col gap-2">
          {error && <p className="text-xs text-[#E53E3E] px-1">{error}</p>}
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-[#f7f5f4] border border-[#e5e2e1] rounded-2xl flex items-center pr-1 overflow-hidden focus-within:border-[#b51822]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ketik pesan untuk CS…"
                rows={1}
                className="w-full bg-transparent p-3 text-base sm:text-sm text-[#1c1b1b] focus:outline-none resize-none max-h-32"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className={`p-2 rounded-xl shrink-0 ${
                  input.trim() ? 'bg-[#b51822] text-white hover:bg-[#90121a]' : 'text-[#9e8e8c]'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
