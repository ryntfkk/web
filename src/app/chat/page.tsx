"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, MessageSquare } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

interface ChatRoomDTO {
  order_id: string;
  order_number: string;
  partner_name: string;
  partner_avatar_url?: string;
  customer_name: string;
  customer_avatar_url?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_active: boolean;
}

export default function ChatListPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [chats, setChats] = useState<ChatRoomDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchChats();
  }, [isAuthenticated]);

  const fetchChats = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/chat/rooms');
    if (res.success && res.data) {
      setChats(res.data.data ?? res.data);
    }
    setLoading(false);
  };

  const isMitra = user?.active_role === 'mitra';

  const filteredChats = chats.filter(c => {
    const statusMatch = activeTab === 'active' ? c.is_active : !c.is_active;
    const nameToSearch = isMitra ? c.customer_name : c.partner_name;
    const searchMatch = nameToSearch?.toLowerCase().includes(search.toLowerCase()) || 
                        c.order_number?.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const formatTime = (time: string) => {
    if (!time) return '';
    const date = new Date(time);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 px-4 py-4">
            <Link href={isMitra ? "/mitra" : "/"} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </Link>
            <h1 className="text-base font-bold text-[#1c1b1b]">Pesan</h1>
          </div>
          
          {/* Tabs */}
          <div className="flex px-4 border-b border-[#e5e2e1]">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'active' ? 'border-[#b51822] text-[#b51822]' : 'border-transparent text-[#9e8e8c]'}`}
            >
              Aktif
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'archived' ? 'border-[#b51822] text-[#b51822]' : 'border-transparent text-[#9e8e8c]'}`}
            >
              Arsip
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9e8e8c]" />
          <input
            type="text"
            placeholder="Cari nama atau nomor pesanan"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-[#e5e2e1] rounded p-2.5 pl-9 text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
          />
        </div>

        {/* Chat List */}
        <div className="space-y-2">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded border border-[#e5e2e1] p-4 flex gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-[#e5e2e1] shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-[#e5e2e1] rounded w-1/3" />
                  <div className="h-3 bg-[#e5e2e1] rounded w-2/3" />
                </div>
              </div>
            ))
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="w-12 h-12 text-[#e5e2e1] mx-auto mb-3" />
              <p className="text-sm text-[#5b403e]">Tidak ada percakapan {activeTab === 'active' ? 'aktif' : 'di arsip'}.</p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const displayName = isMitra ? chat.customer_name : chat.partner_name;
              const displayAvatar = isMitra ? chat.customer_avatar_url : chat.partner_avatar_url;
              return (
                <Link
                  key={chat.order_id}
                  href={`/chat/${chat.order_id}`}
                  className="block bg-white rounded border border-[#e5e2e1] p-4 hover:bg-[#f7f5f4] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#e5e2e1] flex items-center justify-center text-lg font-bold text-[#5b403e] shrink-0 overflow-hidden relative">
                      {displayAvatar
                        ? <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                        : displayName?.charAt(0)?.toUpperCase() || '?'
                      }
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-semibold text-[#1c1b1b] truncate pr-2">{displayName}</p>
                        <p className="text-xs text-[#9e8e8c] shrink-0">{formatTime(chat.last_message_at)}</p>
                      </div>
                      <p className="text-xs text-[#9e8e8c] mb-1">Pesanan {chat.order_number}</p>
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-sm text-[#5b403e] truncate">{chat.last_message}</p>
                        {chat.unread_count > 0 && (
                          <span className="shrink-0 w-5 h-5 bg-[#b51822] text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
