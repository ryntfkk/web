"use client";

import { usePathname } from 'next/navigation';
import FloatingChat from './floating-chat';

export default function FloatingChatWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith('/chat')) return null;

  return <FloatingChat />;
}
