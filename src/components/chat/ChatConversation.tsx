"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ROLE_PARTNER } from '@/lib/constants';
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
  orderId: string;
  /** If true, renders as embedded panel (no back button, no full-screen) */
  embedded?: boolean;
  onBack?: () => void;
}

export default function ChatConversation({ orderId, embedded = false, onBack }: ChatConversationProps) {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [partner, setPartner] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isArchived, setIsArchived] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isConnected, sendTypingIndicator } = useWebSocket({
    orderId,
    onMessage: (msg: Message) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.sender_id !== user?.id) {
        fetchAPI(`/chat/${orderId}/messages/${msg.id}/read`, { method: 'PUT' });
      }
    },
    onTyping: () => {},
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const orderRes = await fetchAPI<any>(`/orders/${orderId}`);
      if (orderRes.success && orderRes.data) {
        const orderData = orderRes.data.data || orderRes.data;
        if (user?.active_role === ROLE_PARTNER) {
          setPartner({
            name: orderData.customer?.name || 'Customer',
            avatar_url: orderData.customer?.avatar_url,
          });
        } else {
          setPartner({
            name: orderData.partner?.name || 'Mitra',
            avatar_url: orderData.partner?.avatar_url,
          });
        }
        setIsArchived(orderData.status === 'COMPLETED' || orderData.status === 'CANCELLED');
      } else if (user?.active_role === ROLE_PARTNER) {
        const mitraOrderRes = await fetchAPI<any>(`/mitra/orders/${orderId}`);
        if (mitraOrderRes.success && mitraOrderRes.data) {
          const orderData = mitraOrderRes.data.data || mitraOrderRes.data;
          setPartner({
            name: orderData.customer?.name || 'Customer',
            avatar_url: orderData.customer?.avatar_url,
          });
          setIsArchived(orderData.status === 'COMPLETED' || orderData.status === 'CANCELLED');
        }
      }

      const msgRes = await fetchAPI<any>(`/chat/${orderId}/messages?per_page=100`);
      if (msgRes.success && msgRes.data?.data) {
        setMessages(msgRes.data.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [orderId, user?.active_role]);

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

    const res = await fetchAPI<any>(`/chat/${orderId}/messages`, {
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

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const isMitra = user?.active_role === ROLE_PARTNER;

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'min-h-screen h-screen'} bg-[#f7f5f4]`}>
      {/* Header */}
      <div className={`bg-white border-b border-[#e5e2e1] shrink-0 ${embedded ? '' : 'sticky top-0 z-10 shadow-sm'}`}>
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
                    partner.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h1 className="text-sm font-bold text-[#1c1b1b] leading-tight">{partner.name}</h1>
                  <Link
                    href={isMitra ? `/mitra/orders/${orderId}` : `/orders/${orderId}`}
                    className="text-[11px] text-[#b51822] font-semibold hover:underline mt-0.5 inline-block"
                  >
                    Lihat Pesanan
                  </Link>
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
                      <img src={msg.content} alt="Attachment" className="max-w-full rounded mb-2 border border-black/10" />
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
      <div className="bg-white border-t border-[#e5e2e1] mt-auto shrink-0">
        {isArchived ? (
          <div className={`p-4 text-center ${embedded ? '' : 'max-w-lg mx-auto'}`}>
            <p className="text-sm text-[#9e8e8c] font-medium">Sesi chat ini telah diarsipkan karena pesanan selesai.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className={`p-3 flex flex-col gap-2 ${embedded ? '' : 'max-w-lg mx-auto'}`}>
            {sendError && (
              <div className="text-xs text-[#E53E3E] px-2 font-medium bg-[#FFF5F5] py-1.5 rounded-lg border border-[#FEB2B2]">
                {sendError}
              </div>
            )}
            <div className="flex items-end gap-2">
              <button type="button" className="p-2.5 text-[#5b403e] hover:bg-[#f7f5f4] rounded-full transition-colors shrink-0">
                <ImageIcon className="w-5 h-5" />
              </button>
            <button type="button" className="p-2.5 text-[#5b403e] hover:bg-[#f7f5f4] rounded-full transition-colors shrink-0">
              <Camera className="w-5 h-5" />
            </button>
            <div className="flex-1 bg-[#f7f5f4] border border-[#e5e2e1] rounded-2xl flex items-center pr-1 overflow-hidden transition-colors focus-within:border-[#b51822]">
              <textarea
                value={input}
                onChange={handleTyping}
                placeholder="Ketik pesan..."
                className="w-full bg-transparent p-3 text-sm text-[#1c1b1b] focus:outline-none resize-none max-h-32"
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
        )}
      </div>
    </div>
  );
}
