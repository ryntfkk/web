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

  const handleSelectChat = (roomId: string) => {
    // Desktop/tablet (md+): tampilkan di panel kanan; Mobile: navigasi ke halaman room
    if (window.innerWidth >= 768) {
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
        <div className="w-full md:w-[320px] lg:w-[360px] xl:w-[400px] md:min-w-[300px] flex flex-col border-r border-[#e5e2e1] bg-white shrink-0 min-h-0">
          <div className="px-4 pt-4 shrink-0">
            <h1 className="text-lg font-bold text-[#1c1b1b] mb-1">Chat</h1>
          </div>
          <div className="flex-1 min-h-0">
            <ChatRoomList
              onSelect={handleSelectChat}
              selectedRoomId={selectedRoomId}
              onFirstRoom={(roomId) => {
                // Auto-select percakapan pertama hanya di layar md+
                if (typeof window !== 'undefined' && window.innerWidth >= 768) {
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
