'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

/**
 * Kartu kecil "Masukan" yang disisipkan di feed home (gaya Shopee . kartunya
 * lebih pendek dari kartu jasa sehingga ikut membuat feed mobile staggered).
 * Diklik → modal masukan. Di desktop mengisi satu sel grid (tetap sejajar).
 */
export function FeedbackCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Beri masukan untuk aplikasi"
        className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand-gray-100 bg-brand-gray-70 p-4 text-center transition-colors hover:bg-brand-gray-100"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-red shadow-sm">
          <MessageSquarePlus className="h-5 w-5" />
        </span>
        <span className="text-[13px] font-semibold text-brand-gray-900">Bantu kami jadi lebih baik</span>
        <span className="text-[11px] leading-snug text-brand-gray-700">
          Punya saran atau keluhan? Beri masukan singkat.
        </span>
        <span className="mt-1 rounded-full bg-brand-red px-3 py-1 text-[11px] font-semibold text-white">
          Beri Masukan
        </span>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
