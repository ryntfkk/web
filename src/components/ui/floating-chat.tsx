"use client";

import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from './button';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


export default function FloatingChat() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();

  // Only show chat button for authenticated users
  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  const handleClick = () => {
    // Navigate to the chat list page
    router.push('/chat');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden lg:block">
      {/* Floating button - boxy style */}
      <Button
        onClick={handleClick}
        className="rounded-lg w-14 h-14 bg-[#b51822] hover:bg-[#90121a] shadow-lg flex items-center justify-center p-0 transition-all hover:scale-105"
        title="Buka Pesan"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </Button>
    </div>
  );
}
