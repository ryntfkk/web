"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatRoomList from '@/components/chat/ChatRoomList';
import ChatConversation from '@/components/chat/ChatConversation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2, MessageSquare } from 'lucide-react';


export default function ChatClient({ roomId }: { roomId: string }) {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const [selectedRoomId, setSelectedRoomId] = useState(roomId);

  // BottomNav disembunyikan di room chat — hapus padding bawah body agar
  // area percakapan pas satu layar tanpa scroll kosong.
  useEffect(() => {
    document.body.classList.add('chat-room');
    return () => document.body.classList.remove('chat-room');
  }, []);

  // Desktop/tablet (md+): tampilkan split-panel; Mobile: navigasi ke halaman room.
  // matchMedia mengikuti breakpoint Tailwind `md` (768px) — konsisten dgn /chat page.
  const isDesktopViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;

  const handleSelectChat = (newRoomId: string) => {
    if (isDesktopViewport()) {
      setSelectedRoomId(newRoomId);
      // Update URL tanpa full navigation agar tombol back browser tetap benar
      window.history.replaceState(null, '', `/chat/${newRoomId}`);
    } else {
      router.push(`/chat/${newRoomId}`);
    }
  };

  if (authLoading) {
    return (
      <div className="page-h flex items-center justify-center bg-brand-gray-60">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    // Mobile: h-full karena TopNavbar & BottomNav sudah di-hide oleh routing.
    // Desktop: h-[calc(100dvh-4rem)] karena ada TopNavbar.
    <div className="h-[100dvh] md:h-[calc(100dvh-4rem)] flex flex-col bg-white overflow-hidden">
      <div className="flex flex-1 min-h-0">

        {/* ===== LEFT PANEL: Chat List (desktop only) ===== */}
        <div className="hidden md:flex w-96 flex-col border-r border-brand-gray-100 bg-white shrink-0 min-h-0">
          <div className="px-4 pt-4 shrink-0">
            <h1 className="text-lg font-bold text-brand-gray-900 mb-1">Chat</h1>
          </div>
          <div className="flex-1 min-h-0">
            <ChatRoomList
              onSelect={handleSelectChat}
              selectedRoomId={selectedRoomId}
            />
          </div>
        </div>

        {/* ===== RIGHT PANEL / MOBILE: Conversation ===== */}
        {/* Mobile: full-screen conversation with back button */}
        <div className="flex-1 flex flex-col min-w-0 md:hidden">
          <ChatConversation
            key={selectedRoomId}
            roomId={selectedRoomId}
            onBack={() => router.push('/chat')}
          />
        </div>
        {/* Desktop: embedded conversation panel */}
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          <ChatConversation
            key={selectedRoomId}
            roomId={selectedRoomId}
            embedded
          />
        </div>

      </div>
    </div>
  );
}
