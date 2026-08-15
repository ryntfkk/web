'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/lib/store/authStore';
import { useSubmitFeedback } from '@/hooks/useSubmitFeedback';

const MAX = 2000;

/**
 * Modal masukan: satu kotak tulisan. Bisa diisi tamu maupun user login.
 * Bila login, username ditampilkan (dan ditangkap server dari JWT). Isi masuk
 * ke panel admin (GET /admin/feedback) untuk dibaca tim.
 */
export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const { mutate, isPending, error, reset } = useSubmitFeedback();

  // Bersihkan state tiap kali dibuka (modal tunggal, dipakai berulang).
  useEffect(() => {
    if (open) {
      setMessage('');
      setDone(false);
      reset();
    }
  }, [open, reset]);

  const trimmed = message.trim();
  const canSend = trimmed.length > 0 && !isPending;

  const submit = () => {
    if (!canSend) return;
    mutate(
      { message: trimmed.slice(0, MAX), page_path: pathname || '/' },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Beri Masukan" maxWidthClass="max-w-md">
      {done ? (
        <div className="py-4 text-center">
          <p className="text-[15px] font-semibold text-brand-gray-900">Terima kasih! 🙏</p>
          <p className="mt-1 text-[13px] text-brand-gray-700">
            Masukanmu sudah kami terima dan akan kami pelajari untuk perbaikan aplikasi.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-lg bg-brand-red py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-95"
          >
            Tutup
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-[13px] text-brand-gray-700">
            Apa yang menurutmu perlu kami perbaiki? Saran, keluhan, atau ide . semuanya membantu.
          </p>
          <textarea
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX}
            rows={5}
            placeholder="Tulis masukanmu di sini…"
            className="w-full resize-none rounded-lg border border-brand-gray-100 p-3 text-[14px] text-brand-gray-900 outline-none transition-colors focus:border-brand-red"
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] text-brand-gray-450 truncate">
              {user ? `Masuk sebagai @${user.username}` : 'Bisa diisi tanpa login (sebagai tamu)'}
            </span>
            <span className="shrink-0 text-[11px] text-brand-gray-400">
              {trimmed.length}/{MAX}
            </span>
          </div>
          {error && (
            <p className="mt-2 text-[12px] text-brand-error">{(error as Error).message}</p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className="mt-4 w-full rounded-lg bg-brand-red py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {isPending ? 'Mengirim…' : 'Kirim Masukan'}
          </button>
        </div>
      )}
    </Modal>
  );
}
