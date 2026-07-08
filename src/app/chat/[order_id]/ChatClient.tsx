"use client";

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import ChatConversation from '@/components/chat/ChatConversation';

export default function ChatClient({ orderId }: { orderId: string }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return <ChatConversation orderId={orderId} onBack={() => router.push('/chat')} />;
}
