"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Send, LifeBuoy, Lock } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SupportMessage, SupportThread, isThreadClosed, SUPPORT_STATUS_LABEL } from '@/lib/support';

const POLL_MS = 7000;

function ChatInput({ onSend, sending }: { onSend: (content: string) => void; sending: boolean }) {
  const [input, setInput] = useState('');

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="bg-white border-t border-brand-gray-100 shrink-0 pb-[env(safe-area-inset-bottom)]">
      <form onSubmit={handleSend} className="p-3 max-w-2xl mx-auto flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-brand-gray-60 border border-brand-gray-100 rounded-2xl flex items-center pr-1 overflow-hidden focus-within:border-brand-red">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik pesan untuk CS…"
              rows={1}
              className="w-full bg-transparent p-3 text-base sm:text-sm text-brand-gray-900 focus:outline-none resize-none max-h-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Kirim pesan"
              className={`p-2 rounded-xl shrink-0 ${
                input.trim() ? 'bg-brand-red text-white hover:bg-brand-red-dark' : 'text-brand-gray-450'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/**
 * Ruang percakapan CS . dipakai pelanggan (/bantuan/[id]) dan mitra
 * (/mitra/bantuan/chat/[id]). Yang membedakan hanya `backHref` dan tinggi
 * layarnya, karena mode mitra tidak punya TopNavbar di breakpoint mana pun.
 */
export default function SupportChat({
  reportId,
  backHref,
  /**
   * Tujuan "kembali ke daftar percakapan" saat thread ditutup. Terpisah dari
   * `backHref`: panah kembali bisa balik ke asal (mis. detail pesanan) sedang
   * tombol daftar tetap ke kotak masuk. Default = `backHref`.
   */
  inboxHref,
  /**
   * Sisi pelanggan memakai TopNavbar 4rem mulai `lg` (HeaderWrapper), jadi
   * layarnya harus dikurangi setinggi itu. Mode mitra tidak . lihat
   * MitraLayoutClient.
   */
  heightClass = 'h-[100dvh] lg:h-[calc(100dvh-4rem)]',
}: {
  reportId: string;
  backHref: string;
  inboxHref?: string;
  heightClass?: string;
}) {
  const listHref = inboxHref ?? backHref;
  const { isAuthorized } = useRequireAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Nav bawah & footer disembunyikan untuk rute ini (BottomNav/Footer), jadi
  // `pb-16` milik <body> harus ikut dilepas . tanpa ini layar `100dvh` masih
  // menyisakan 64px yang bisa di-scroll dan kolom ketik terdorong keluar.
  useEffect(() => {
    document.body.classList.add('chat-room');
    return () => document.body.classList.remove('chat-room');
  }, []);

  const load = useCallback(async () => {
    const [msgRes, threadRes] = await Promise.all([
      fetchAPI<SupportMessage[]>(`/reports/${reportId}/messages`),
      fetchAPI<SupportThread>(`/reports/${reportId}`),
    ]);
    if (msgRes.success && Array.isArray(msgRes.data)) setMessages(msgRes.data);
    // Endpoint detail baru . bila backend belum diperbarui, perlakukan thread
    // sebagai terbuka daripada mengunci kolom ketik tanpa alasan.
    if (threadRes.success && threadRes.data) setThread(threadRes.data);
    setLoading(false);
  }, [reportId]);

  useEffect(() => {
    if (!isAuthorized) return;
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [isAuthorized, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const closed = thread ? isThreadClosed(thread.status) : false;

  const send = async (content: string) => {
    const txt = content.trim();
    if (!txt || sending) return;
    setSending(true);
    setError(null);
    const res = await fetchAPI<SupportMessage>(`/reports/${reportId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: txt, message_type: 'text' }),
    });
    setSending(false);
    if (res.success && res.data) {
      setMessages((prev) => [...prev, res.data as SupportMessage]);
    } else {
      setError(res.message || 'Gagal mengirim pesan.');
    }
  };

  return (
    <div className={`flex flex-col ${heightClass} bg-brand-gray-60`}>
      {/* Header */}
      <div className="bg-white border-b border-brand-gray-100 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          {/* Link, bukan router.push('/bantuan') yang dulu di-hardcode: mitra
              yang datang dari /mitra/bantuan harus kembali ke sana, bukan
              mendarat di kotak masuk versi pelanggan. */}
          <Link href={backHref} className="p-2 -ml-2 hover:bg-brand-gray-60 rounded" aria-label="Kembali">
            <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-brand-red-soft flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-brand-red" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-brand-gray-900 leading-tight">Customer Service</h1>
              <p className="text-[11px] text-brand-gray-450">
                {thread ? SUPPORT_STATUS_LABEL[thread.status] || 'Posko Jasa' : 'Posko Jasa'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Send className="w-8 h-8 text-brand-gray-100 mb-3" />
            <p className="text-sm text-brand-gray-450">Mulai percakapan dengan tim CS kami.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_type === 'user';
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {!isMe && <span className="text-[11px] text-brand-gray-450 mb-0.5 px-1">{m.sender_name || 'CS'}</span>}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl shadow-sm ${
                    isMe
                      ? 'bg-brand-red text-white rounded-br-sm'
                      : 'bg-white border border-brand-gray-100 text-brand-gray-900 rounded-bl-sm'
                  }`}
                >
                  {m.message_type === 'image' ? (
                    <a href={m.content} target="_blank" rel="noopener noreferrer">
                      <Image
                        src={m.content}
                        alt="Lampiran"
                        width={480}
                        height={360}
                        className="max-w-full max-h-64 w-auto h-auto object-contain rounded"
                      />
                    </a>
                  ) : (
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                <span className="text-[11px] text-brand-gray-450 mt-1 px-1">
                  {new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="text-xs text-brand-error text-center py-1">{error}</p>}

      {/* Thread yang sudah ditutup admin: kolom ketik diganti keterangan.
          Sebelumnya pesan tetap terkirim (backend pun menerimanya) ke
          percakapan yang tak dibaca siapa pun. */}
      {closed ? (
        <div className="bg-white border-t border-brand-gray-100 shrink-0 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-2xl mx-auto p-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-brand-gray-700">
              <Lock className="w-4 h-4" /> Percakapan ini sudah ditutup
            </p>
            <p className="text-xs text-brand-gray-450 mt-1 mb-3">
              Masih ada yang perlu dibantu? Mulai percakapan baru.
            </p>
            <Link
              href={listHref}
              className="inline-flex items-center justify-center rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark"
            >
              Kembali ke Daftar Percakapan
            </Link>
          </div>
        </div>
      ) : (
        <ChatInput onSend={send} sending={sending} />
      )}
    </div>
  );
}
