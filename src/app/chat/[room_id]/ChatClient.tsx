"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import ChatConversation from '@/components/chat/ChatConversation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


export default function ChatClient({ roomId }: { roomId: string }) {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  // BottomNav disembunyikan di room chat — hapus padding bawah body agar
  // area percakapan pas satu layar tanpa scroll kosong.
  useEffect(() => {
    document.body.classList.add('chat-room');
    return () => document.body.classList.remove('chat-room');
  }, []);

  if (authLoading) {
    return (
      <div className="page-h flex items-center justify-center bg-[#f7f5f4]">
        <Loader2 className="w-8 h-8 text-[#b51822] animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <ChatConversation roomId={roomId} onBack={() => router.push('/chat')} />;
}
