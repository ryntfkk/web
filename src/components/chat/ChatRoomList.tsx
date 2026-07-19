"use client";

import { getInitial } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { ROLE_PARTNER } from '@/lib/constants';

export interface ChatRoom {
  room_id: string;
  partner_name?: string;
  customer_name?: string;
  partner_avatar_url?: string;
  customer_avatar_url?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  is_active?: boolean;
}

interface ChatRoomListProps {
  onSelect: (roomId: string) => void;
  selectedRoomId?: string | null;
  /** Padding lebih rapat — untuk floating panel */
  compact?: boolean;
  /** Dipanggil sekali setelah fetch jika ada minimal satu room (untuk auto-select di desktop) */
  onFirstRoom?: (roomId: string) => void;
}

function formatTime(time?: string) {
  if (!time) return '';
  const date = new Date(time);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return date.toLocaleDateString('id-ID', { weekday: 'long' });
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/**
 * Daftar percakapan — dipakai halaman /chat dan floating chat panel (desktop).
 * Fetch, pencarian, dan sorting ada di sini agar tidak ada duplikasi logika.
 */
export default function ChatRoomList({ onSelect, selectedRoomId, compact = false, onFirstRoom }: ChatRoomListProps) {
  const user = useAuthStore((s) => s.user);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const firstRoomNotified = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetchAPI<any>('/chat/rooms');
      if (!cancelled && res.success && res.data) {
        const data: ChatRoom[] = res.data;
        setChats(data);
        if (data.length > 0 && !firstRoomNotified.current) {
          firstRoomNotified.current = true;
          onFirstRoom?.(data[0].room_id);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMitra = user?.active_role === ROLE_PARTNER;

  const filteredChats = chats
    .filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const name = (isMitra ? c.customer_name : c.partner_name) || '';
      return name.toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return timeB - timeA;
    });

  const itemPad = compact ? 'px-3 py-2.5' : 'px-4 py-3';
  const avatarSize = compact ? 'w-10 h-10' : 'w-12 h-12';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search */}
      <div className={`${compact ? 'px-3 pt-3' : 'px-4 pt-2'} pb-2 shrink-0`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9e8e8c]" />
          <input
            type="text"
            placeholder="Cari nama atau pesan"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f7f5f4] rounded-lg p-2.5 pl-9 text-sm text-[#1c1b1b] placeholder:text-[#9e8e8c] focus:outline-none focus:ring-1 focus:ring-[#b51822] border-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex items-center gap-3 ${itemPad} animate-pulse`}>
                <div className={`${avatarSize} rounded-full bg-[#e5e2e1] shrink-0`} />
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
            {filteredChats.map((chat) => {
              const displayName = (isMitra ? chat.customer_name : chat.partner_name) || '?';
              const displayAvatar = isMitra ? chat.customer_avatar_url : chat.partner_avatar_url;
              const isSelected = selectedRoomId === chat.room_id;
              const hasUnread = (chat.unread_count ?? 0) > 0;

              return (
                <button
                  key={chat.room_id}
                  onClick={() => onSelect(chat.room_id)}
                  className={`w-full flex items-center gap-3 ${itemPad} text-left transition-colors hover:bg-[#f7f5f4] relative ${
                    isSelected ? 'bg-[#fdf1f1]' : ''
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#b51822] rounded-r" />
                  )}

                  <div className={`${avatarSize} rounded-full bg-[#e5e2e1] flex items-center justify-center text-base font-bold text-[#5b403e] shrink-0 overflow-hidden relative`}>
                    {displayAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      getInitial(displayName)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className={`text-[14px] truncate pr-2 ${hasUnread ? 'font-bold' : 'font-semibold'} text-[#1c1b1b]`}>
                        {displayName}
                      </p>
                      <span className={`text-[11px] shrink-0 ${hasUnread ? 'text-[#b51822] font-semibold' : 'text-[#9e8e8c]'}`}>
                        {formatTime(chat.last_message_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1">
                        {chat.is_active === false && (
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
                          {(chat.unread_count ?? 0) > 99 ? '99+' : chat.unread_count}
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
  );
}
