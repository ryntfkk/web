"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import ChatRoomList from '@/components/chat/ChatRoomList';
import ChatConversation from '@/components/chat/ChatConversation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';

export default function ChatListPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Desktop/tablet (md+): tampilkan di panel kanan; Mobile: navigasi ke halaman room.
  // matchMedia mengikuti breakpoint Tailwind `md` (768px) — satu sumber kebenaran.
  const isDesktopViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;

  const handleSelectChat = (roomId: string) => {
    if (isDesktopViewport()) {
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
        <div className="w-full md:w-96 flex flex-col border-r border-brand-gray-100 bg-white shrink-0 min-h-0">
          <div className="px-4 pt-4 shrink-0">
            <h1 className="text-lg font-bold text-brand-gray-900 mb-1">Chat</h1>
          </div>
          <div className="flex-1 min-h-0">
            <ChatRoomList
              onSelect={handleSelectChat}
              selectedRoomId={selectedRoomId}
              onFirstRoom={(roomId) => {
                // Auto-select percakapan pertama hanya di layar md+
                if (isDesktopViewport()) {
                  setSelectedRoomId((prev) => prev ?? roomId);
                }
              }}
            />
          </div>
        </div>

        {/* ===== RIGHT PANEL: Conversation (md+) ===== */}
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          {selectedRoomId ? (
            <ChatConversation
              key={selectedRoomId}
              roomId={selectedRoomId}
              embedded
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-brand-gray-60">
              <div className="w-16 h-16 rounded-full bg-brand-red-light flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-brand-gray-400" />
              </div>
              <h2 className="text-base font-bold text-brand-gray-700 mb-2">Pilih percakapan</h2>
              <p className="text-sm text-brand-gray-450 max-w-xs">
                Pilih salah satu percakapan dari daftar di sebelah kiri untuk mulai chat.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
