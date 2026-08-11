'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Penyaringnya sengaja TIDAK memakai `offsetParent !== null`. Properti itu
 * bernilai null untuk subtree berposisi fixed . persis bentuk dialog ini .
 * sehingga daftar fokusable jadi kosong dan focus trap diam-diam tidak
 * melakukan apa pun. (Jebakan yang sama sudah tercatat di `MitraModal`.)
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  /** Header kustom (fixed/shrink-0) menggantikan baris judul+X bawaan. */
  header?: React.ReactNode;
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
  header,
  padded = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  /**
   * Escape + focus trap.
   *
   * `aria-modal="true"` sudah menyembunyikan konten di luar dialog dari pembaca
   * layar . tapi fokus KEYBOARD tetap bisa keluar ke halaman yang tak terlihat
   * itu. Modal ini dipakai di seluruh aplikasi (pemilih variasi, ganti peran,
   * dialog laporan), dan sampai 2026-08-11 tidak satu pun menahannya (audit D5).
   * Logikanya sengaja disamakan dengan `MitraModal`, yang sudah benar.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true',
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Membungkus fokus di KEDUA arah . tanpa cabang shift, Shift+Tab dari
      // elemen pertama tetap lolos keluar dialog.
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    // Fokus awal ke panel, bukan ke tombol pertama: kalau tombol pertama adalah
    // aksi destruktif, Enter refleks langsung mengeksekusinya.
    panelRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown, true);
      // Kembalikan fokus ke pemicunya . kalau tidak, fokus jatuh ke <body> dan
      // pengguna keyboard harus menelusuri halaman dari awal.
      restoreRef.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative z-10 flex w-full flex-col border border-brand-gray-100 bg-white shadow-2xl outline-none ${maxWidthClass} max-h-[88vh] rounded-t-2xl duration-200 animate-in slide-in-from-bottom-5 sm:max-h-[85vh] sm:rounded-2xl sm:zoom-in-95 sm:slide-in-from-bottom-0 pb-[env(safe-area-inset-bottom)] sm:pb-0`}
      >
        {/* Indikator geser (mobile) */}
        <div className="flex w-full justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-brand-gray-100" />
        </div>

        {header ? (
          <div className="shrink-0">{header}</div>
        ) : !hideHeader ? (
          <div className="flex shrink-0 items-center justify-between border-b border-brand-gray-100 px-5 pt-2 pb-3 sm:pt-4">
            <h3 id={titleId} className="text-[16px] font-bold text-brand-gray-900 sm:text-[17px]">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gray-70 text-brand-gray-700 transition-colors hover:bg-brand-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className={`min-h-0 flex-1 overflow-y-auto ${padded ? 'p-5' : ''}`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
