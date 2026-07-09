"use client";

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import ChatConversation from '@/components/chat/ChatConversation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


export default function ChatClient({ orderId }: { orderId: string }) {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f5f4]">
        <Loader2 className="w-8 h-8 text-[#b51822] animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <ChatConversation orderId={orderId} onBack={() => router.push('/chat')} />;
}
