"use client";

import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden lg:block">
      {isOpen ? (
        <div className="bg-white border border-[#e5e2e1] shadow-xl w-80 h-96 rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="bg-[#b51822] text-white p-4 flex justify-between items-center">
            <div className="font-bold">Chat Bantuan</div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 bg-[#f7f5f4] p-4 flex items-center justify-center">
            <p className="text-[#8f6f6d] text-sm text-center">Fitur chat sedang dalam pengembangan.</p>
          </div>
          <div className="p-3 bg-white border-t border-[#e5e2e1]">
            <input 
              type="text" 
              placeholder="Tulis pesan..." 
              className="w-full bg-[#f7f5f4] border border-[#d4c8c7] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#b51822]"
              disabled
            />
          </div>
        </div>
      ) : (
        <Button 
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-[#b51822] hover:bg-[#90121a] shadow-lg flex items-center justify-center p-0"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      )}
    </div>
  );
}
