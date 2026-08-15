'use client';

import { useState, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

import { Modal } from '@/components/ui/modal';

interface SectionHelpProps {
  /** Judul sheet + dasar `aria-label` tombol. */
  label: string;
  /** Penjelasan "mengapa data ini penting". String multibaris didukung. */
  children: ReactNode;
  /** `md` = ikon judul kartu (h-4); `sm` = label field (h-3.5). */
  size?: 'sm' | 'md';
  /** Penempatan tombol, mis. `ml-auto` agar rata kanan di baris judul kartu. */
  className?: string;
}

/**
 * Tombol tanda-tanya kecil yang membuka penjelasan "mengapa data ini penting"
 * sebagai bottom-sheet (mobile) / dialog (desktop).
 *
 * Sengaja MEMBUNGKUS `Modal` yang sudah membawa focus-trap, Esc, klik-luar, dan
 * portal di atas bottom-nav . jadi ini cuma pemicu, bukan infrastruktur popover
 * baru. Tujuannya ganda: mendidik mitra baru TANPA memanjangkan halaman . prosa
 * "kenapa" hidup di dalam sheet, bukan sebagai teks yang selalu tampil.
 */
export default function SectionHelp({ label, children, size = 'md', className = '' }: SectionHelpProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Bantuan: ${label}`}
        className={`inline-flex shrink-0 items-center justify-center rounded-full text-brand-gray-450 transition-colors hover:text-brand-red focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30 ${className}`}
      >
        <HelpCircle className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={label} maxWidthClass="max-w-md">
        <div className="space-y-1 whitespace-pre-line text-sm leading-relaxed text-brand-gray-700">
          {children}
        </div>
      </Modal>
    </>
  );
}
