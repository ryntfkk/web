"use client";

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import FloatingChat from './floating-chat';

export default function FloatingChatWrapper() {
  const pathname = usePathname();
  const activeRole = useAuthStore((s) => s.user?.active_role);

  if (pathname.startsWith('/chat')) return null;
  // Mitra punya halaman chat sendiri (/mitra/chat) . floating chat tidak relevan.
  if (pathname.startsWith('/mitra')) return null;
  if (activeRole === 'partner') return null;

  return <FloatingChat />;
}
