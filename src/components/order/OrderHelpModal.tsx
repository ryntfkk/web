'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeadphonesIcon, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { createSupportThread, supportBasePath } from '@/lib/support';

/**
 * Modal konfirmasi "Hubungi Admin" untuk halaman detail pesanan.
 * Sebelumnya tombol Bantuan LANGSUNG membuat thread laporan tanpa konfirmasi .
 * kini pengguna mengonfirmasi + bisa menuliskan masalahnya dulu (seperti
 * marketplace lain), baru thread dibuat & diarahkan ke /bantuan/[id].
 */
export default function OrderHelpModal({
  open,
  onClose,
  orderNumber,
  isMitra = false,
}: {
  open: boolean;
  onClose: () => void;
  orderNumber: string;
  isMitra?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    setSending(true);
    setError('');
    const who = isMitra ? 'saya (mitra)' : 'saya';
    const base = `Halo CS Posko Jasa, ${who} butuh bantuan terkait Pesanan #${orderNumber}.`;
    const description = message.trim() ? `${base}\n\n${message.trim()}` : base;
    const id = await createSupportThread({ category: 'other', description });
    setSending(false);
    if (id) {
      setMessage('');
      onClose();
      // `isMitra` sudah dioper pemanggil . pakai itu, jangan baca store lagi.
      router.push(`${supportBasePath(isMitra ? 'partner' : undefined)}/${id}`);
    } else {
      setError('Gagal memulai percakapan. Coba lagi.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Hubungi Admin">
      <div className="mb-4 flex items-start gap-3 rounded-xl bg-brand-gray-60 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
          <HeadphonesIcon className="h-4 w-4" />
        </div>
        <p className="text-[13px] leading-relaxed text-brand-gray-700">
          Kamu akan memulai percakapan dengan admin terkait{' '}
          <span className="font-semibold text-brand-gray-900">Pesanan #{orderNumber}</span>. Ceritakan
          masalahnya (opsional) agar admin lebih cepat membantu.
        </p>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Tulis masalah/pertanyaanmu (opsional)…"
        className="w-full rounded-xl border border-brand-gray-100 p-3 text-[14px] text-brand-gray-900 placeholder:text-brand-gray-400 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
      />

      {error && <p className="mt-2 text-[12px] text-brand-error">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-brand-gray-100 px-4 py-2 text-[13px] font-medium text-brand-gray-700 hover:bg-brand-gray-60"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-red px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeadphonesIcon className="h-4 w-4" />}
          {sending ? 'Memulai…' : 'Mulai Chat dengan Admin'}
        </button>
      </div>
    </Modal>
  );
}
