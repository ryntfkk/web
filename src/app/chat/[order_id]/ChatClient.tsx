"use client";

import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import ChatConversation from '@/components/chat/ChatConversation';

export default function ChatClient() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.order_id as string;

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return <ChatConversation orderId={orderId} onBack={() => router.push('/chat')} />;
}
