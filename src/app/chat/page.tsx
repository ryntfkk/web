"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MessageSquare } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import ChatConversation from '@/components/chat/ChatConversation';
import { ROLE_PARTNER } from '@/lib/constants';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


export default function ChatListPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    fetchChats();
  }, [isAuthenticated]);

  const fetchChats = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/chat/rooms');
    if (res.success && res.data) {
      const data: any[] = res.data;
      setChats(data);
      // Auto-select first chat on desktop if none selected
      if (data.length > 0 && !selectedRoomId) {
        setSelectedRoomId(data[0].room_id);
      }
    }
    setLoading(false);
  };

  const isMitra = user?.active_role === ROLE_PARTNER;

  // Unified list — no active/archived separation, sorted by most recent
  const filteredChats = chats
    .filter(c => {
      if (!search) return true;
      const nameToSearch = isMitra ? c.customer_name : c.partner_name;
      return nameToSearch?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      // Sort by last_message_at descending (most recent first)
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return timeB - timeA;
    });

  const formatTime = (time: string) => {
    if (!time) return '';
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) {
      return date.toLocaleDateString('id-ID', { weekday: 'long' });
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const handleSelectChat = (roomId: string) => {
    // On desktop (lg+), show in the right panel
    // On mobile, navigate to the chat page
    if (window.innerWidth >= 1024) {
      setSelectedRoomId(roomId);
    } else {
      router.push(`/chat/${roomId}`);
    }
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    // Mobile: viewport − navbar (4rem) − BottomNav (4rem); Desktop: − navbar saja
    <div className="h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] flex flex-col bg-white overflow-hidden">
      {/* Desktop: split panel | Mobile: full list */}
      <div className="flex flex-1 min-h-0">

        {/* ===== LEFT PANEL: Chat List ===== */}
        <div className="w-full lg:w-[360px] xl:w-[400px] lg:min-w-[320px] flex flex-col border-r border-[#e5e2e1] bg-white shrink-0">

          {/* Header */}
          <div className="px-4 pt-4 pb-2 shrink-0">
            <h1 className="text-lg font-bold text-[#1c1b1b] mb-3">Chat</h1>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9e8e8c]" />
              <input
                type="text"
                placeholder="Cari nama"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#f7f5f4] rounded-lg p-2.5 pl-9 text-sm text-[#1c1b1b] placeholder:text-[#9e8e8c] focus:outline-none focus:ring-1 focus:ring-[#b51822] border-none"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-0">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-[#e5e2e1] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-[#e5e2e1] rounded w-2/5" />
                      <div className="h-3 bg-[#e5e2e1] rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <MessageSquare className="w-14 h-14 text-[#e5e2e1] mb-4" />
                <p className="text-sm text-[#9e8e8c] font-medium">
                  {search ? 'Tidak ditemukan' : 'Belum ada percakapan'}
                </p>
              </div>
            ) : (
              <div>
                {filteredChats.map(chat => {
                  const displayName = isMitra ? chat.customer_name : chat.partner_name;
                  const displayAvatar = isMitra ? chat.customer_avatar_url : chat.partner_avatar_url;
                  const isSelected = selectedRoomId === chat.room_id;
                  const hasUnread = chat.unread_count > 0;

                  return (
                    <button
                      key={chat.room_id}
                      onClick={() => handleSelectChat(chat.room_id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f7f5f4] relative ${
                        isSelected ? 'bg-[#fdf1f1] lg:bg-[#fdf1f1]' : ''
                      }`}
                    >
                      {/* Selected indicator bar */}
                      {isSelected && (
                        <div className="hidden lg:block absolute left-0 top-2 bottom-2 w-[3px] bg-[#b51822] rounded-r" />
                      )}

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-[#e5e2e1] flex items-center justify-center text-base font-bold text-[#5b403e] shrink-0 overflow-hidden relative">
                        {displayAvatar ? (
                          <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          displayName?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className={`text-[14px] truncate pr-2 ${hasUnread ? 'font-bold text-[#1c1b1b]' : 'font-semibold text-[#1c1b1b]'}`}>
                            {displayName}
                          </p>
                          <span className={`text-[11px] shrink-0 ${hasUnread ? 'text-[#b51822] font-semibold' : 'text-[#9e8e8c]'}`}>
                            {formatTime(chat.last_message_at)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0 flex-1">
                            {!chat.is_active && (
                              <span className="inline-block text-[10px] text-[#9e8e8c] bg-[#f0eded] rounded px-1.5 py-0.5 mr-1.5 font-medium align-middle">
                                Selesai
                              </span>
                            )}
                            <span className={`text-[13px] truncate ${hasUnread ? 'text-[#1c1b1b] font-medium' : 'text-[#9e8e8c]'}`}>
                              {chat.last_message || 'Belum ada pesan'}
                            </span>
                          </div>
                          {hasUnread && (
                            <span className="shrink-0 min-w-[20px] h-5 bg-[#b51822] text-white text-[11px] font-bold flex items-center justify-center rounded-full px-1.5">
                              {chat.unread_count > 99 ? '99+' : chat.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT PANEL: Conversation (Desktop only) ===== */}
        <div className="hidden lg:flex flex-1 flex-col min-w-0">
          {selectedRoomId ? (
            <ChatConversation
              key={selectedRoomId}
              roomId={selectedRoomId}
              embedded
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-[#fafafa]">
              <div className="w-20 h-20 rounded-full bg-[#f0eded] flex items-center justify-center mb-5">
                <MessageSquare className="w-9 h-9 text-[#c4b8b6]" />
              </div>
              <h2 className="text-base font-bold text-[#5b403e] mb-2">Pilih percakapan</h2>
              <p className="text-sm text-[#9e8e8c] max-w-xs">
                Pilih salah satu percakapan dari daftar di sebelah kiri untuk mulai chat.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

