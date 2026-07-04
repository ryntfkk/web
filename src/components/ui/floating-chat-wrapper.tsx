"use client";

import { useAuthStore } from '@/lib/store/authStore';
import FloatingChat from './floating-chat';

export default function FloatingChatWrapper() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return <FloatingChat isAuthenticated={isAuthenticated} />;
}
