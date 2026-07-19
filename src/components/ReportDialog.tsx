"use client";

import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

type TargetType = 'partner' | 'service' | 'review' | 'chat_message' | 'user';

const REASONS: { value: string; label: string }[] = [
  { value: 'fraud', label: 'Penipuan' },
  { value: 'harassment', label: 'Pelecehan' },
  { value: 'inappropriate', label: 'Konten tidak pantas' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Lainnya' },
];

interface ReportDialogProps {
  targetType: TargetType;
  targetId: string;
  label?: string;
  className?: string;
}

export default function ReportDialog({
  targetType,
  targetId,
  label = 'Laporkan',
  className = '',
}: ReportDialogProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('fraud');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const openDialog = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setDone(false);
    setError('');
    setDesc('');
    setReason('fraud');
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetchAPI<any>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason_category: reason,
          description: desc.trim() || undefined,
        }),
      });
      if (res.success) {
        // Laporan kini ditangani via chat CS — arahkan ke percakapannya agar
        // pengguna bisa langsung berbalas dengan admin (bukan lagi WhatsApp).
        if (res.data?.id) {
          setOpen(false);
          router.push(`/bantuan/${res.data.id}`);
          return;
        }
        setDone(true);
      } else {
        setError(res.message || 'Gagal mengirim laporan.');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={`inline-flex items-center gap-1 text-xs text-[#9e8e8c] hover:text-[#b51822] ${className}`}
      >
        <Flag className="w-3.5 h-3.5" /> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#1c1b1b]">Laporkan</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {done ? (
              <div className="py-6 text-center">
                <p className="text-sm text-[#1c1b1b] mb-4">
                  Terima kasih. Laporan Anda telah dikirim dan akan ditinjau tim kami.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded bg-[#b51822] text-white text-sm"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <>
                <label className="block text-xs font-medium text-[#5b403e] mb-1">Alasan</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-[#e5e2e1] rounded px-3 py-2 text-sm mb-3"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <label className="block text-xs font-medium text-[#5b403e] mb-1">
                  Detail (opsional)
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-[#e5e2e1] rounded px-3 py-2 text-sm mb-3"
                  placeholder="Jelaskan masalahnya…"
                />

                {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 rounded border border-[#e5e2e1] text-sm"
                  >
                    Batal
                  </button>
                  <button
                    onClick={submit}
                    disabled={busy}
                    className="px-4 py-2 rounded bg-[#b51822] text-white text-sm disabled:opacity-50"
                  >
                    {busy ? 'Mengirim…' : 'Kirim Laporan'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
