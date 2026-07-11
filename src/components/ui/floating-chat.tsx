"use client";

import { useRouter } from 'next/navigation';
import { MessageCircle, X, Maximize2, ArrowLeft } from 'lucide-react';
import { Button } from './button';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatUiStore } from '@/lib/store/chatUiStore';
import ChatRoomList from '@/components/chat/ChatRoomList';
import ChatConversation from '@/components/chat/ChatConversation';

/**
 * Floating chat untuk desktop: FAB yang membuka panel chat melayang
 * (daftar percakapan -> percakapan) tanpa meninggalkan halaman.
 */
export default function FloatingChat() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const { isPanelOpen, activeRoomId, togglePanel, closePanel, selectRoom, backToList } = useChatUiStore();

  // Hide (don't redirect!) when not authenticated or still loading
  if (isInitializing || !isAuthenticated) return null;

  const openFullPage = () => {
    closePanel();
    router.push(activeRoomId ? `/chat/${activeRoomId}` : '/chat');
  };

  return (
    <div className="hidden lg:block">
      {/* Panel */}
      {isPanelOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[540px] max-h-[calc(100dvh-8rem)] bg-white border border-[#e5e2e1] rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e5e2e1] bg-[#fcf9f8] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {activeRoomId && (
                <button
                  onClick={backToList}
                  className="p-1.5 -ml-1 hover:bg-[#f0eded] rounded-lg transition-colors"
                  title="Kembali ke daftar"
                >
                  <ArrowLeft className="w-4 h-4 text-[#5b403e]" />
                </button>
              )}
              <h2 className="text-sm font-bold text-[#1c1b1b] truncate">Chat</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={openFullPage}
                className="p-1.5 hover:bg-[#f0eded] rounded-lg transition-colors"
                title="Buka halaman penuh"
              >
                <Maximize2 className="w-4 h-4 text-[#5b403e]" />
              </button>
              <button
                onClick={closePanel}
                className="p-1.5 hover:bg-[#f0eded] rounded-lg transition-colors"
                title="Tutup"
              >
                <X className="w-4 h-4 text-[#5b403e]" />
              </button>
            </div>
          </div>

          {/* Panel body */}
          <div className="flex-1 min-h-0 flex flex-col">
            {activeRoomId ? (
              <ChatConversation key={activeRoomId} roomId={activeRoomId} embedded />
            ) : (
              <ChatRoomList compact onSelect={selectRoom} />
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={togglePanel}
          className="rounded-lg w-14 h-14 bg-[#b51822] hover:bg-[#90121a] shadow-lg flex items-center justify-center p-0 transition-all hover:scale-105"
          title={isPanelOpen ? 'Tutup Pesan' : 'Buka Pesan'}
        >
          {isPanelOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white" />
          )}
        </Button>
      </div>
    </div>
  );
}
