"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import ChatRoomList from '@/components/chat/ChatRoomList';
import ChatConversation from '@/components/chat/ChatConversation';
import { ListItemSkeleton } from '@/components/ui/skeleton';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function MitraChatPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Desktop (lg+): panel kanan; di bawahnya navigasi ke halaman room.
  // Ambang `lg` (1024px), bukan `md`: pada 768px dua panel berarti
  // daftar 384px + percakapan 384px . terlalu sempit (audit B6).
  const isDesktopViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const handleSelectChat = (roomId: string) => {
    if (isDesktopViewport()) {
      setSelectedRoomId(roomId);
    } else {
      router.push(`/mitra/chat/${roomId}`);
    }
  };

  if (authLoading) return <div className="min-h-[100dvh]"><ListItemSkeleton count={8} /></div>;
  if (!isAuthorized) return null;

  return (
    // Tanpa TopNavbar. MitraBottomNav (4rem) hanya tampil DI BAWAH lg . di
    // desktop navigasinya sidebar, jadi mengurangi 4rem di sana menyisakan strip
    // abu mati di dasar layar.
    <div className="h-[calc(100dvh-4rem)] lg:h-[100dvh] flex flex-col bg-white overflow-hidden">
      <div className="flex flex-1 min-h-0">

        {/* ===== LEFT PANEL: Chat List ===== */}
        <div className="w-full lg:w-96 flex flex-col border-r border-brand-gray-100 bg-white shrink-0 min-h-0 pt-[env(safe-area-inset-top,0px)]">
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

        {/* ===== RIGHT PANEL: Conversation (lg+) ===== */}
        <div className="hidden lg:flex flex-1 flex-col min-w-0">
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
                Pilih salah satu percakapan dari daftar di sebelah kiri untuk mulai chat dengan pelanggan.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
