"use client";

import { useRouter } from 'next/navigation';
import { MessageCircle, Maximize2, ArrowLeft, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatUiStore } from '@/lib/store/chatUiStore';
import ChatRoomList from '@/components/chat/ChatRoomList';
import ChatConversation from '@/components/chat/ChatConversation';

/**
 * Floating chat desktop ala marketplace: tombol pill "Chat" di kanan bawah.
 * Saat dibuka, tombol hilang dan panel muncul menempel di dasar layar.
 */
export default function FloatingChat() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const { isPanelOpen, activeRoomId, openPanel, closePanel, selectRoom, backToList } = useChatUiStore();

  // Hide (don't redirect!) when not authenticated or still loading
  if (isInitializing || !isAuthenticated) return null;

  const openFullPage = () => {
    closePanel();
    router.push(activeRoomId ? `/chat/${activeRoomId}` : '/chat');
  };

  return (
    <div className="hidden lg:block">
      {isPanelOpen ? (
        /* ── Panel: menempel di dasar layar, ala Shopee/Tokopedia ── */
        <div className="fixed bottom-0 right-6 z-50 w-[400px] h-[520px] max-h-[calc(100dvh-6rem)] bg-white border border-b-0 border-[#e5e2e1] rounded-t-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e5e2e1] bg-[#b51822] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {activeRoomId ? (
                <button
                  onClick={backToList}
                  className="p-1 -ml-0.5 hover:bg-white/15 rounded-lg transition-colors"
                  title="Kembali ke daftar"
                >
                  <ArrowLeft className="w-4 h-4 text-white" />
                </button>
              ) : (
                <MessageCircle className="w-4 h-4 text-white" />
              )}
              <h2 className="text-sm font-bold text-white truncate">Chat</h2>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={openFullPage}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                title="Buka halaman penuh"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={closePanel}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                title="Kecilkan"
              >
                <ChevronDown className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 flex flex-col">
            {activeRoomId ? (
              <ChatConversation key={activeRoomId} roomId={activeRoomId} embedded />
            ) : (
              <ChatRoomList compact onSelect={selectRoom} />
            )}
          </div>
        </div>
      ) : (
        /* ── Launcher pill: hanya tampil saat panel tertutup ── */
        <button
          onClick={() => openPanel()}
          title="Buka Pesan"
          className="fixed bottom-0 right-6 z-50 flex items-center gap-2 bg-[#b51822] hover:bg-[#90121a] text-white font-bold text-sm pl-4 pr-5 py-2.5 rounded-t-xl shadow-lg transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          Chat
        </button>
      )}
    </div>
  );
}
