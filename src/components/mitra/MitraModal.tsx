'use client';

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Modal mode mitra dengan perilaku fokus yang benar (§6.4, P2 a11y).
 *
 * Tiga hal yang sebelumnya hilang di setiap dialog yang ditulis manual:
 *
 * 1. **Focus trap.** Tanpa ini Tab keluar dari dialog dan menjelajahi halaman di
 *    belakangnya yang tidak terlihat . pengguna keyboard menekan tombol yang
 *    tidak bisa ia lihat, termasuk aksi destruktif di daftar di baliknya.
 * 2. **Escape menutup.** Satu-satunya jalan keluar dulu adalah menemukan tombol
 *    X secara visual.
 * 3. **Fokus dikembalikan.** Setelah dialog tertutup fokus kembali ke elemen
 *    yang membukanya, bukan lompat ke awal dokumen.
 *
 * Badan dialog boleh menggulir sendiri (`max-h` + `overflow-y-auto`) agar dialog
 * tidak pernah keluar viewport di layar pendek (§6.5).
 */
interface MitraModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Penjelasan opsional; ikut jadi `aria-describedby`. */
  description?: string;
  children?: ReactNode;
  /** Baris tombol di bawah. */
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function MitraModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: MitraModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  // useId, bukan Math.random di ref: id-nya harus sama antara render server dan
  // klien, kalau tidak `aria-labelledby` menunjuk ke id yang tak pernah ada.
  const titleId = useId();
  const descId = `${titleId}-desc`;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      // Penyaringnya sengaja TIDAK memakai `offsetParent !== null`. Properti itu
      // bernilai null untuk subtree berposisi fixed . persis bentuk dialog ini .
      // sehingga daftar fokusable jadi kosong dan focus trap diam-diam tidak
      // melakukan apa pun. Isi panel selalu benar-benar dirender saat terbuka,
      // jadi yang perlu dibuang hanya yang eksplisit disembunyikan/dinonaktifkan.
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

      // Membungkus fokus di kedua arah. Tanpa cabang shift, Shift+Tab dari
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Fokus awal ke panel, bukan ke tombol pertama: kalau tombol pertama adalah
    // aksi destruktif, Enter refleks langsung mengeksekusinya.
    panelRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-xl bg-white shadow-lg outline-none"
      >
        <div className="flex items-start justify-between gap-3 px-6 pb-2 pt-6">
          <h2 id={titleId} className="text-base font-semibold text-brand-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="-mr-2 -mt-1 rounded-md p-2 text-brand-gray-450 hover:bg-brand-gray-60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {description && (
            <p id={descId} className="text-sm leading-relaxed text-brand-gray-700">
              {description}
            </p>
          )}
          {children}
        </div>

        {footer && <div className="flex gap-3 border-t border-brand-gray-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
