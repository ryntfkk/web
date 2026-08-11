"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatRoomList from '@/components/chat/ChatRoomList';
import ChatConversation from '@/components/chat/ChatConversation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2, MessageSquare } from 'lucide-react';

export default function MitraChatClient({ roomId }: { roomId: string }) {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const [selectedRoomId, setSelectedRoomId] = useState(roomId);

  // MitraBottomNav disembunyikan di room chat (via MitraLayoutClient excludeBottomNav)
  // . hapus padding bawah body agar area percakapan pas satu layar.
  useEffect(() => {
    document.body.classList.add('chat-room');
    return () => document.body.classList.remove('chat-room');
  }, []);

  // Desktop (lg+): split-panel; di bawahnya halaman room penuh (audit B6).
  const isDesktopViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const handleSelectChat = (newRoomId: string) => {
    if (isDesktopViewport()) {
      setSelectedRoomId(newRoomId);
      // Update URL tanpa full navigation agar tombol back browser tetap benar
      window.history.replaceState(null, '', `/mitra/chat/${newRoomId}`);
    } else {
      router.push(`/mitra/chat/${newRoomId}`);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    // Penuh satu layar di SEMUA breakpoint: room chat termasuk `isExcludedFlow`
    // sehingga MitraBottomNav disembunyikan, dan mode mitra tak punya TopNavbar.
    // Tidak ada apa pun yang perlu dikurangi . `md:calc(100dvh-4rem)` dulu
    // menyisakan strip abu 64px di dasar layar desktop.
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden">
      <div className="flex flex-1 min-h-0">

        {/* ===== LEFT PANEL: Chat List (desktop only) ===== */}
        <div className="hidden lg:flex w-96 flex-col border-r border-brand-gray-100 bg-white shrink-0 min-h-0">
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
        <div className="flex-1 flex flex-col min-w-0 lg:hidden">
          <ChatConversation
            key={selectedRoomId}
            roomId={selectedRoomId}
            onBack={() => router.push('/mitra/chat')}
          />
        </div>
        {/* Desktop: embedded conversation panel */}
        <div className="hidden lg:flex flex-1 flex-col min-w-0">
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
