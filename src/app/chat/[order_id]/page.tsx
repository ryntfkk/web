"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

interface Message {
  id: string;
  sender_id: string;
  text?: string;
  image_url?: string;
  created_at: string;
}

export default function ChatRoomPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.order_id as string;

  const [partner, setPartner] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isArchived, setIsArchived] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchChatDetails();
    
    // Simulate WebSocket connection
    const interval = setInterval(() => {
      // Polling for MVP instead of true WS unless WS is ready
      // fetchMessages();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChatDetails = async () => {
    setLoading(true);
    // Fetch partner info and messages
    const res = await fetchAPI<any>(`/chat/rooms/${orderId}`);
    if (res.success && res.data) {
      setPartner(res.data.partner);
      setMessages(res.data.messages || []);
      setIsArchived(res.data.status === 'archived');
    }
    setLoading(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isArchived) return;

    const tempMsg: Message = {
      id: Date.now().toString(),
      sender_id: user?.id || '',
      text: input,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setInput('');

    // Send to API
    await fetchAPI(`/chat/rooms/${orderId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: tempMsg.text })
    });
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#f7f5f4] flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </button>
            {partner && (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#e5e2e1] flex items-center justify-center text-sm font-bold text-[#5b403e] shrink-0 overflow-hidden">
                  {partner.avatar_url ? <img src={partner.avatar_url} alt={partner.name} className="w-full h-full object-cover" /> : partner.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-sm font-bold text-[#1c1b1b] leading-tight">{partner.name}</h1>
                  <Link href={`/orders/${orderId}`} className="text-[10px] text-[#b51822] font-semibold hover:underline">
                    Lihat Pesanan
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === user?.id;
            const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i-1].created_at).toDateString();
            
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="bg-[#e5e2e1] text-[#5b403e] text-[10px] font-medium px-2 py-1 rounded-full">
                      {new Date(msg.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col mb-4 max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <div className={`p-3 rounded-2xl ${isMe ? 'bg-[#b51822] text-white rounded-br-sm' : 'bg-white border border-[#e5e2e1] text-[#1c1b1b] rounded-bl-sm'}`}>
                    {msg.image_url && <img src={msg.image_url} alt="Attachment" className="max-w-full rounded mb-2 border border-black/10" />}
                    {msg.text && <p className="text-sm">{msg.text}</p>}
                  </div>
                  <span className="text-[10px] text-[#9e8e8c] mt-1">{formatTime(msg.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-[#e5e2e1] mt-auto">
        {isArchived ? (
          <div className="max-w-lg mx-auto p-4 text-center">
            <p className="text-sm text-[#9e8e8c] font-medium">Sesi chat ini telah diarsipkan karena pesanan selesai.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="max-w-lg mx-auto p-3 flex items-end gap-2">
            <button type="button" className="p-2.5 text-[#5b403e] hover:bg-[#f7f5f4] rounded-full transition-colors shrink-0">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button type="button" className="p-2.5 text-[#5b403e] hover:bg-[#f7f5f4] rounded-full transition-colors shrink-0">
              <Camera className="w-5 h-5" />
            </button>
            <div className="flex-1 bg-[#f7f5f4] border border-[#e5e2e1] rounded-2xl flex items-center pr-1 overflow-hidden">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ketik pesan..."
                className="w-full bg-transparent p-3 text-sm text-[#1c1b1b] focus:outline-none resize-none max-h-32"
                rows={1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className={`p-2 rounded-xl transition-colors shrink-0 ${input.trim() ? 'bg-[#b51822] text-white hover:bg-[#90121a]' : 'text-[#9e8e8c]'}`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
