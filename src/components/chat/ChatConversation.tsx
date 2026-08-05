"use client";

import { getInitial } from '@/lib/utils';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Send, Camera, Image as ImageIcon, Loader2 as UploadSpinner } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ROLE_PARTNER } from '@/lib/constants';
import { createSupportThread } from '@/lib/support';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';


interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
  status?: 'pending' | 'error' | 'sent';
}

interface ChatConversationProps {
  roomId: string;
  /** If true, renders as embedded panel (no back button, no full-screen) */
  embedded?: boolean;
  onBack?: () => void;
}

export default function ChatConversation({ roomId, embedded = false, onBack }: ChatConversationProps) {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [partner, setPartner] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isArchived, setIsArchived] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isConnected, sendTypingIndicator } = useWebSocket({
    roomId,
    onMessage: (msg: Message) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.sender_id !== user?.id) {
        setOtherTyping(false); // pesan datang → lawan berhenti mengetik
        fetchAPI(`/chat/${roomId}/messages/${msg.id}/read`, { method: 'PUT' }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
        });
      }
    },
    onTyping: (data: { sender_id?: string; is_typing?: boolean }) => {
      if (data?.sender_id === user?.id) return; // abaikan indikator diri sendiri
      setOtherTyping(!!data?.is_typing);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (data?.is_typing) {
        // Auto-clear bila tak ada update lanjutan (lawan berhenti tanpa kirim stop).
        typingTimeout.current = setTimeout(() => setOtherTyping(false), 4000);
      }
    },
  });

  useEffect(() => () => { if (typingTimeout.current) clearTimeout(typingTimeout.current); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const roomRes = await fetchAPI<any>(`/chat/rooms`);
      if (roomRes.success && roomRes.data) {
        // Envelope dirapikan di batas API (lib/api.ts), jadi di sini datanya
        // sudah berupa array room.
        const rooms = (roomRes.data as any[]);
        const currentRoom = Array.isArray(rooms)
          ? rooms.find((r: any) => r.room_id === roomId)
          : undefined;
        if (currentRoom) {
          // Tentukan lawan bicara PER-room via user.id . bukan active_role global,
          // yang keliru untuk user dual-role (mitra yang juga jadi pelanggan) pada
          // room di sisi lain. Fallback ke active_role bila backend belum kirim id.
          const hasIds = user?.id && currentRoom.partner_id && currentRoom.customer_id;
          const iAmPartner = hasIds
            ? currentRoom.partner_id === user?.id
            : user?.active_role === ROLE_PARTNER;
          if (iAmPartner) {
            setPartner({
              name: currentRoom.customer_name || 'Customer',
              avatar_url: currentRoom.customer_avatar_url,
            });
          } else {
            setPartner({
              name: currentRoom.partner_name || 'Mitra',
              avatar_url: currentRoom.partner_avatar_url,
            });
          }
          setIsArchived(!currentRoom.is_active);

          // Try to fetch active order context
          try {
            const endpoint = iAmPartner ? '/mitra/orders' : '/orders';
            const ordersRes = await fetchAPI<any>(endpoint);
            if (ordersRes.success && ordersRes.data) {
              const orders = (ordersRes.data as any[]);
              if (Array.isArray(orders)) {
                // Find an active order with this specific partner/customer
                const active = orders.find(o => {
                  const isActiveStatus = ['WAITING_CONFIRMATION', 'WAITING_PAYMENT', 'PAID', 'IN_PROGRESS'].includes(o.status);
                  if (!isActiveStatus) return false;

                  if (iAmPartner) {
                    return o.user?.id === currentRoom.customer_id || o.user_id === currentRoom.customer_id;
                  } else {
                    return o.partner?.id === currentRoom.partner_id || o.partner?.user_id === currentRoom.partner_id || o.partner_id === currentRoom.partner_id;
                  }
                });
                if (active) setActiveOrder(active);
              }
            }
          } catch (e) {
            console.error('Failed to fetch order context', e);
          }
        }
      }

      const msgRes = await fetchAPI<any>(`/chat/${roomId}/messages?per_page=100`);
      if (msgRes.success && msgRes.data) {
        const msgs = (msgRes.data as Message[]);
        if (Array.isArray(msgs)) {
          setMessages(msgs);

          // Mark room as read if there are unread messages from the other person
          const hasUnread = msgs.some(m => !m.is_read && m.sender_id !== user?.id);
          if (hasUnread) {
            fetchAPI(`/chat/${roomId}/read`, { method: 'PUT' }).then(() => {
              queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [roomId, user?.id, user?.active_role]);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchData();
  }, [isAuthorized, fetchData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);



  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isArchived) return;

    const content = input;
    setInput('');
    setSendError(null);

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      sender_id: user?.id || '',
      sender_name: user?.name || '',
      sender_role: user?.active_role || '',
      content,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    setMessages(prev => [...prev, tempMsg]);

    const res = await fetchAPI<any>(`/chat/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, message_type: 'text' }),
    });

    if (res.success && res.data) {
      setMessages(prev => prev.map(m => m.id === tempId ? res.data : m));
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(content);
      setSendError(res.message || 'Gagal mengirim pesan');
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    sendTypingIndicator(e.target.value.length > 0);
  };

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

  // Kirim foto: upload via presigned URL lalu kirim pesan message_type=image.
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset agar file yang sama bisa dipilih ulang
    if (!file || isArchived || uploading) return;

    if (!file.type.startsWith('image/')) {
      setSendError('File harus berupa gambar.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setSendError('Ukuran foto maksimal 5MB.');
      return;
    }

    setSendError(null);
    setUploading(true);

    // Pesan sementara dengan preview lokal (optimistic)
    const tempId = `temp-img-${Date.now()}`;
    const previewUrl = URL.createObjectURL(file);
    setMessages((prev) => [...prev, {
      id: tempId,
      sender_id: user?.id || '',
      sender_name: user?.name || '',
      sender_role: user?.active_role || '',
      content: previewUrl,
      message_type: 'image',
      is_read: false,
      created_at: new Date().toISOString(),
      status: 'pending',
    }]);

    try {
      // 1. Minta presigned URL
      const presignedRes = await fetchAPI<any>('/uploads/presigned-url', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
      });
      const presigned = presignedRes.success
        ? ((presignedRes.data as any)?.data ?? presignedRes.data)
        : null;
      if (!presigned?.upload_url || !presigned?.file_url) {
        throw new Error('Gagal mendapatkan URL upload');
      }

      // 2. Upload file ke storage
      const uploadRes = await fetch(presigned.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Gagal mengunggah foto');

      // 3. Kirim pesan bertipe image
      const res = await fetchAPI<any>(`/chat/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: presigned.file_url, message_type: 'image' }),
      });
      if (!res.success || !res.data) throw new Error(res.message || 'Gagal mengirim foto');

      setMessages((prev) => prev.map((m) => (m.id === tempId ? res.data : m)));
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendError(err?.message || 'Gagal mengirim foto.');
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploading(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const isMitra = user?.active_role === ROLE_PARTNER;

  return (
    <div className="flex flex-col h-full bg-brand-gray-60">
      {/* Header */}
      <div className={`bg-white border-b border-brand-gray-100 shrink-0 ${embedded ? '' : 'shadow-sm pt-[env(safe-area-inset-top,0px)]'}`}>
        <div className={`flex items-center justify-between px-4 py-3 ${embedded ? '' : 'max-w-lg mx-auto'}`}>
          <div className="flex items-center gap-3">
            {!embedded && (
              <button onClick={onBack || (() => router.back())} className="p-2 -ml-2 hover:bg-brand-gray-60 rounded" aria-label="Kembali">
                <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
              </button>
            )}
            {partner ? (
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full bg-brand-gray-100 flex items-center justify-center text-sm font-bold text-brand-gray-700 shrink-0 overflow-hidden">
                  {partner.avatar_url ? (
                    <Image src={partner.avatar_url} alt={partner.name} fill sizes="40px" className="object-cover" />
                  ) : (
                    getInitial(partner.name)
                  )}
                </div>
                <div>
                  <h1 className="text-sm font-bold text-brand-gray-900 leading-tight">{partner.name}</h1>
                  {otherTyping && (
                    <p className="text-xs text-brand-red leading-tight animate-pulse">sedang mengetik…</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-gray-100 shrink-0 animate-pulse" />
                <div className="space-y-2">
                  <div className="w-24 h-3 bg-brand-gray-100 rounded animate-pulse" />
                  <div className="w-16 h-2 bg-brand-gray-100 rounded animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anti-disintermediation warning bar */}
      <div className="bg-brand-warning-soft border-b border-brand-warning-border px-4 py-2 flex items-center gap-2 shrink-0">
        <span className="text-xs text-brand-warning-dark flex-1">
          {"\u26A0\uFE0F"} <strong>Selalu bayar melalui Posko Jasa.</strong> Transaksi di luar platform tidak dilindungi escrow.
        </span>
        <button
          type="button"
          onClick={async () => {
            const id = await createSupportThread({
              category: 'fraud',
              description: 'Halo CS Posko Jasa, ada pihak yang meminta pembayaran di luar platform.',
            });
            if (id) router.push(`/bantuan/${id}`);
          }}
          className="text-[10px] font-semibold text-brand-red hover:underline shrink-0 whitespace-nowrap"
        >
          Laporkan
        </button>
      </div>

      {/* Context Card (Active Order) */}
      {activeOrder && (
        <div className={`shrink-0 border-b border-brand-gray-100 bg-white p-3 shadow-sm z-10 ${embedded ? '' : 'max-w-lg mx-auto w-full'}`}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold text-brand-gray-400 uppercase tracking-wider mb-0.5">Pesanan Aktif</span>
              <span className="text-sm font-bold text-brand-gray-900 truncate">
                {activeOrder.order_number}
              </span>
              <span className="text-xs text-brand-gray-700 truncate">
                {activeOrder.items?.[0]?.service_name || activeOrder.items?.[0]?.name || 'Layanan Jasa'}
                {activeOrder.items?.length > 1 && ` +${activeOrder.items.length - 1} lainnya`}
              </span>
            </div>
            <Link
              href={isMitra ? `/mitra/orders/${activeOrder.id}` : `/orders/${activeOrder.id}`}
              className="shrink-0 bg-brand-red-soft text-brand-red hover:bg-brand-red-soft px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            >
              Lihat Detail
            </Link>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${embedded ? '' : 'max-w-lg mx-auto w-full'}`}>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-gray-100 flex items-center justify-center mb-4">
              <Send className="w-6 h-6 text-brand-gray-450" />
            </div>
            <p className="text-sm text-brand-gray-450">Belum ada pesan. Mulai percakapan!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === user?.id;
            const showDate =
              i === 0 ||
              new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString();

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="bg-brand-gray-100 text-brand-gray-700 text-[10px] font-medium px-3 py-1 rounded-full shadow-sm">
                      {new Date(msg.created_at).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col mb-4 max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl shadow-sm ${isMe
                        ? 'bg-brand-red text-white rounded-br-sm'
                        : 'bg-white border border-brand-gray-100 text-brand-gray-900 rounded-bl-sm'
                      }`}
                  >
                    {msg.message_type === 'image' && (
                      <a href={msg.content} target="_blank" rel="noopener noreferrer">
                        {msg.content.startsWith('blob:') ? (
                          // Preview optimistic lokal (blob:) tidak bisa lewat optimizer next/image.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={msg.content}
                            alt="Foto lampiran dalam percakapan"
                            loading="lazy"
                            className="max-w-full max-h-64 object-contain rounded border border-black/10"
                          />
                        ) : (
                          <Image
                            src={msg.content}
                            alt="Foto lampiran dalam percakapan"
                            width={480}
                            height={360}
                            className="max-w-full max-h-64 w-auto h-auto object-contain rounded border border-black/10"
                          />
                        )}
                      </a>
                    )}
                    {msg.message_type === 'text' && <p className="text-[14px] leading-relaxed">{msg.content}</p>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-brand-gray-450">{formatTime(msg.created_at)}</span>
                    {isMe && msg.status === 'pending' && (
                      <span className="text-[10px] text-brand-gray-450">...</span>
                    )}
                    {isMe && msg.status !== 'pending' && (
                      <span className={`text-[10px] font-medium ${msg.is_read ? 'text-brand-success' : 'text-brand-gray-450'}`}>
                        {msg.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`bg-white border-t border-brand-gray-100 mt-auto shrink-0 flex flex-col ${embedded ? '' : 'pb-[env(safe-area-inset-bottom)]'}`}>
        {isArchived ? (
          <div className={`p-4 text-center ${embedded ? '' : 'max-w-lg mx-auto'}`}>
            <p className="text-sm text-brand-gray-450 font-medium">Sesi chat ini telah diarsipkan karena pesanan selesai.</p>
          </div>
        ) : (
          <div className={`flex flex-col w-full ${embedded ? '' : 'max-w-lg mx-auto'}`}>
            {/* Quick Replies for Mitra */}
            {isMitra && (
              <div className="flex gap-2 overflow-x-auto px-3 pt-3 pb-1 scrollbar-hide touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                {["Halo, ada yang bisa dibantu?", "Saya segera menuju lokasi.", "Baik, pesanan sudah saya terima.", "Mohon ditunggu sebentar ya."].map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInput(reply)}
                    className="shrink-0 bg-brand-gray-60 hover:bg-brand-red-light border border-brand-gray-100 text-brand-gray-700 text-xs px-3 py-1.5 rounded-full transition-colors whitespace-nowrap font-medium"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSend} className="p-3 flex flex-col gap-2 w-full">
              {sendError && (
                <div className="text-xs text-brand-error px-2 font-medium bg-brand-error-soft py-1.5 rounded-lg border border-brand-error-border">
                  {sendError}
                </div>
              )}
              <div className="flex items-end gap-2">
                {/* Input file tersembunyi: galeri & kamera (capture di mobile) */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploading}
                  title="Kirim foto dari galeri"
                  className="p-2.5 text-brand-gray-700 hover:bg-brand-gray-60 rounded-full transition-colors shrink-0 disabled:opacity-50"
                >
                  {uploading ? <UploadSpinner className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                  title="Ambil foto dengan kamera"
                  className="p-2.5 text-brand-gray-700 hover:bg-brand-gray-60 rounded-full transition-colors shrink-0 disabled:opacity-50 sm:hidden"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <div className="flex-1 bg-brand-gray-60 border border-brand-gray-100 rounded-2xl flex items-center pr-1 overflow-hidden transition-colors focus-within:border-brand-red">
                  <textarea
                    value={input}
                    onChange={handleTyping}
                    placeholder="Ketik pesan..."
                    className="w-full bg-transparent p-3 text-base sm:text-sm text-brand-gray-900 focus:outline-none resize-none max-h-32"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={`p-2 rounded-xl transition-colors shrink-0 ${input.trim() ? 'bg-brand-red text-white hover:bg-brand-red-dark shadow-sm' : 'text-brand-gray-450'
                      }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

