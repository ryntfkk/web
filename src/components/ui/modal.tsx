'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Primitive Modal bersama untuk web.
 *
 * Kenapa portal: modal dirender ke `document.body`, LEPAS dari stacking-context
 * `<main>`, sehingga SELALU di atas `BottomNav`/`MitraBottomNav` (`fixed z-50`).
 * Sebelumnya modal dirender inline → sebagian tertutup bottom-nav di mobile.
 *
 * Skala z-index baku: nav 50 < modal 100 < toast 200.
 * Mobile = bottom-sheet (aman safe-area); desktop = kartu terpusat yang ringkas.
 */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Lebar maksimum di desktop. Default ringkas. */
  maxWidthClass?: string;
  /** Sembunyikan header bawaan (mis. modal yang punya header sendiri). */
  hideHeader?: boolean;
  /** Padding body. Default p-5; set false untuk konten yang atur padding sendiri. */
  padded?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClass = 'max-w-sm',
  hideHeader = false,
  padded = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      <div
        className={`relative z-10 flex w-full flex-col border border-[#e5e2e1] bg-white shadow-2xl ${maxWidthClass} max-h-[88vh] rounded-t-2xl duration-200 animate-in slide-in-from-bottom-5 sm:max-h-[85vh] sm:rounded-2xl sm:zoom-in-95 sm:slide-in-from-bottom-0 pb-[env(safe-area-inset-bottom)] sm:pb-0`}
      >
        {/* Indikator geser (mobile) */}
        <div className="flex w-full justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#e5e2e1]" />
        </div>

        {!hideHeader && (
          <div className="flex shrink-0 items-center justify-between border-b border-[#e5e2e1] px-5 pt-2 pb-3 sm:pt-4">
            <h3 className="text-[16px] font-bold text-[#1c1b1b] sm:text-[17px]">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f3f2] text-[#5b403e] transition-colors hover:bg-[#e5e2e1]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className={`min-h-0 flex-1 overflow-y-auto ${padded ? 'p-5' : ''}`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
