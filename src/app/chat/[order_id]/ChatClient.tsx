"use client";

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import ChatConversation from '@/components/chat/ChatConversation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


export default function ChatClient({ orderId }: { orderId: string }) {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return <ChatConversation orderId={orderId} onBack={() => router.push('/chat')} />;
}
