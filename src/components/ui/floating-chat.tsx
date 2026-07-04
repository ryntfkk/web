"use client";

import { MessageCircle, X, Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';

interface FloatingChatProps {
  isAuthenticated?: boolean;
}

export default function FloatingChat({ isAuthenticated }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show chat for authenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden lg:block">
      {isOpen ? (
        // Chat panel - boxy style like other components
        <div className="bg-white border border-[#e5e2e1] shadow-lg w-80 rounded-lg overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-[#b51822] text-white px-4 py-3 flex justify-between items-center">
            <div className="font-bold text-[14px]">Chat Bantuan</div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Tutup chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat content area */}
          <div className="flex-1 bg-[#f7f5f4] p-4 min-h-[240px] flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-10 h-10 text-[#8f6f6d]/50 mx-auto mb-2" />
              <p className="text-[#8f6f6d] text-sm">Fitur chat sedang dalam pengembangan.</p>
              <p className="text-[#8f6f6d]/70 text-xs mt-1">Hubungi kami via WhatsApp untuk bantuan.</p>
            </div>
          </div>

          {/* Input area */}
          <div className="p-3 bg-white border-t border-[#e5e2e1]">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Tulis pesan..."
                className="flex-1 bg-[#f7f5f4] border border-[#e5e2e1] rounded text-sm px-4 py-2.5 focus:outline-none focus:border-[#b51822] transition-colors"
                disabled
              />
              <Button
                size="sm"
                className="px-3"
                disabled
                aria-label="Kirim pesan"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Floating button - more boxy style
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-lg w-14 h-14 bg-[#b51822] hover:bg-[#90121a] shadow-lg flex items-center justify-center p-0 transition-all hover:scale-105"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      )}
    </div>
  );
}
