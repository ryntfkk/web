"use client";

import { getInitial } from '@/lib/utils';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Camera, Image as ImageIcon, Loader2 as UploadSpinner } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { unwrapData } from '@/lib/order-utils';
import { useAuthStore } from '@/lib/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ROLE_PARTNER } from '@/lib/constants';
import { createSupportThread } from '@/lib/support';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


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
        fetchAPI(`/chat/${roomId}/messages/${msg.id}/read`, { method: 'PUT' });
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
        // unwrapData: envelope bisa satu/dua tingkat — samakan dgn endpoint
        // messages di bawah. Tanpa ini, bila /chat/rooms ganda-wrap, `.find`
        // melempar & header stuck di skeleton selamanya.
        const rooms = unwrapData<any[]>(roomRes.data);
        const currentRoom = Array.isArray(rooms)
          ? rooms.find((r: any) => r.room_id === roomId)
          : undefined;
        if (currentRoom) {
          // Tentukan lawan bicara PER-room via user.id — bukan active_role global,
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
              const orders = unwrapData<any[]>(ordersRes.data);
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
        const msgs = unwrapData<Message[]>(msgRes.data);
        if (Array.isArray(msgs)) setMessages(msgs);
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
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-[100dvh] lg:h-[calc(100dvh-4rem)]'} bg-[#f7f5f4]`}>
      {/* Header */}
      <div className={`bg-white border-b border-[#e5e2e1] shrink-0 ${embedded ? '' : 'shadow-sm'}`}>
        <div className={`flex items-center justify-between px-4 py-3 ${embedded ? '' : 'max-w-lg mx-auto'}`}>
          <div className="flex items-center gap-3">
            {!embedded && (
              <button onClick={onBack || (() => router.back())} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
                <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
              </button>
            )}
            {partner ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e5e2e1] flex items-center justify-center text-sm font-bold text-[#5b403e] shrink-0 overflow-hidden">
                  {partner.avatar_url ? (
                    <img src={partner.avatar_url} alt={partner.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitial(partner.name)
                  )}
                </div>
                <div>
                  <h1 className="text-sm font-bold text-[#1c1b1b] leading-tight">{partner.name}</h1>
                  {otherTyping && (
                    <p className="text-xs text-[#b51822] leading-tight animate-pulse">sedang mengetik…</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e5e2e1] shrink-0 animate-pulse" />
                <div className="space-y-2">
                  <div className="w-24 h-3 bg-[#e5e2e1] rounded animate-pulse" />
                  <div className="w-16 h-2 bg-[#e5e2e1] rounded animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anti-disintermediation warning bar */}
      <div className="bg-[#FFFBEB] border-b border-[#F6E05E] px-4 py-2 flex items-center gap-2 shrink-0">
        <span className="text-xs text-[#744210] flex-1">
          ⚠️ <strong>Selalu bayar melalui Posko Jasa.</strong> Transaksi di luar platform tidak dilindungi escrow.
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
          className="text-[10px] font-semibold text-[#b51822] hover:underline shrink-0 whitespace-nowrap"
        >
          Laporkan
        </button>
      </div>

      {/* Context Card (Active Order) */}
      {activeOrder && (
        <div className={`shrink-0 border-b border-[#e5e2e1] bg-white p-3 shadow-sm z-10 ${embedded ? '' : 'max-w-lg mx-auto w-full'}`}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold text-[#8f6f6d] uppercase tracking-wider mb-0.5">Pesanan Aktif</span>
              <span className="text-sm font-bold text-[#1c1b1b] truncate">
                {activeOrder.order_number}
              </span>
              <span className="text-xs text-[#5b403e] truncate">
                {activeOrder.items?.[0]?.service_name || activeOrder.items?.[0]?.name || 'Layanan Jasa'}
                {activeOrder.items?.length > 1 && ` +${activeOrder.items.length - 1} lainnya`}
              </span>
            </div>
            <Link 
              href={isMitra ? `/mitra/orders/${activeOrder.id}` : `/orders/${activeOrder.id}`}
              className="shrink-0 bg-[#fdf2f2] text-[#b51822] hover:bg-[#fce5e5] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
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
            <div className="w-6 h-6 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#e5e2e1] flex items-center justify-center mb-4">
              <Send className="w-6 h-6 text-[#9e8e8c]" />
            </div>
            <p className="text-sm text-[#9e8e8c]">Belum ada pesan. Mulai percakapan!</p>
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
                    <span className="bg-[#e5e2e1] text-[#5b403e] text-[10px] font-medium px-3 py-1 rounded-full shadow-sm">
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
                    className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                      isMe
                        ? 'bg-[#b51822] text-white rounded-br-sm'
                        : 'bg-white border border-[#e5e2e1] text-[#1c1b1b] rounded-bl-sm'
                    }`}
                  >
                    {msg.message_type === 'image' && (
                      <a href={msg.content} target="_blank" rel="noopener noreferrer">
                        <img
                          src={msg.content}
                          alt="Foto"
                          loading="lazy"
                          className="max-w-full max-h-64 object-contain rounded border border-black/10"
                        />
                      </a>
                    )}
                    {msg.message_type === 'text' && <p className="text-[14px] leading-relaxed">{msg.content}</p>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-[#9e8e8c]">{formatTime(msg.created_at)}</span>
                    {isMe && msg.status === 'pending' && (
                      <span className="text-[10px] text-[#9e8e8c]">...</span>
                    )}
                    {isMe && msg.status !== 'pending' && (
                      <span className={`text-[10px] font-medium ${msg.is_read ? 'text-[#38A169]' : 'text-[#9e8e8c]'}`}>
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
      <div className={`bg-white border-t border-[#e5e2e1] mt-auto shrink-0 flex flex-col ${embedded ? '' : 'pb-[env(safe-area-inset-bottom)]'}`}>
        {isArchived ? (
          <div className={`p-4 text-center ${embedded ? '' : 'max-w-lg mx-auto'}`}>
            <p className="text-sm text-[#9e8e8c] font-medium">Sesi chat ini telah diarsipkan karena pesanan selesai.</p>
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
                    className="shrink-0 bg-[#f7f5f4] hover:bg-[#f0eded] border border-[#e5e2e1] text-[#5b403e] text-xs px-3 py-1.5 rounded-full transition-colors whitespace-nowrap font-medium"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSend} className="p-3 flex flex-col gap-2 w-full">
              {sendError && (
                <div className="text-xs text-[#E53E3E] px-2 font-medium bg-[#FFF5F5] py-1.5 rounded-lg border border-[#FEB2B2]">
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
                className="p-2.5 text-[#5b403e] hover:bg-[#f7f5f4] rounded-full transition-colors shrink-0 disabled:opacity-50"
              >
                {uploading ? <UploadSpinner className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
                title="Ambil foto dengan kamera"
                className="p-2.5 text-[#5b403e] hover:bg-[#f7f5f4] rounded-full transition-colors shrink-0 disabled:opacity-50 sm:hidden"
              >
                <Camera className="w-5 h-5" />
              </button>
            <div className="flex-1 bg-[#f7f5f4] border border-[#e5e2e1] rounded-2xl flex items-center pr-1 overflow-hidden transition-colors focus-within:border-[#b51822]">
              <textarea
                value={input}
                onChange={handleTyping}
                placeholder="Ketik pesan..."
                className="w-full bg-transparent p-3 text-base sm:text-sm text-[#1c1b1b] focus:outline-none resize-none max-h-32"
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
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  input.trim() ? 'bg-[#b51822] text-white hover:bg-[#90121a] shadow-sm' : 'text-[#9e8e8c]'
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

