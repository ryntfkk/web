"use client";

import { useEffect, useState } from "react";
import { X, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "posko_dev_notice_dismissed";

/**
 * DevNoticeModal
 * One-time notice telling visitors the website is still under development.
 * Shown once per browser — dismissal is remembered in localStorage.
 */
export function DevNoticeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only runs on the client, so it never causes an SSR hydration mismatch.
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
      }
    } catch {
      // If storage is unavailable (private mode, etc.) just show it.
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore storage failures */
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-6 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-[#FFF5F5] flex items-center justify-center">
            <Construction className="w-6 h-6 text-[#b51822]" />
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-1 hover:bg-[#f7f5f4] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#9e8e8c]" />
          </button>
        </div>

        <h3 className="text-lg font-bold text-[#1c1b1b] mb-2">
          Website Under Development
        </h3>
        <p className="text-sm text-[#5b403e] leading-relaxed">
          Welcome to Posko Jasa! Please note that this website is still under
          active development. Some features may be incomplete or may not work as
          expected. Thank you for your patience and understanding.
        </p>

        <Button onClick={handleClose} size="lg" className="w-full mt-6">
          Got it
        </Button>
      </div>
    </div>
  );
}
