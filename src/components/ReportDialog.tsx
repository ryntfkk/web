"use client";

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { supportBasePath } from '@/lib/support';

type TargetType = 'partner' | 'service' | 'review' | 'chat_message' | 'user';

export interface ReportReason {
  value: string;
  label: string;
}

const DEFAULT_REASONS: ReportReason[] = [
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
  /**
   * Alasan khusus konteks. Daftar bawaan ditulis untuk pelanggan yang
   * melaporkan mitra; mitra yang melaporkan ulasan punya alasan yang sama
   * sekali berbeda ("bukan pelanggan saya"), dan memaksanya memilih "Spam"
   * hanya menghasilkan laporan yang salah kategori di meja admin.
   */
  reasons?: ReportReason[];
  /** Ikon pemicu. Beberapa tempat memakai teks saja. */
  showIcon?: boolean;
}

export default function ReportDialog({
  targetType,
  targetId,
  label = 'Laporkan',
  className = '',
  reasons: reasonOptions = DEFAULT_REASONS,
  showIcon = true,
}: ReportDialogProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Dialog ini dipakai dari dua sisi: profil mitra publik (pelanggan melapor)
  // dan /mitra/reviews (mitra melapor). Thread-nya harus dibuka di kerangka
  // yang sesuai, bukan selalu kerangka pelanggan.
  const activeRole = useAuthStore((s) => s.user?.active_role);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasonOptions[0]?.value ?? 'other');
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
    setReason(reasonOptions[0]?.value ?? 'other');
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetchAPI<{ id?: string }>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason_category: reason,
          description: desc.trim() || undefined,
        }),
      });
      if (res.success) {
        // Laporan kini ditangani via chat CS . arahkan ke percakapannya agar
        // pengguna bisa langsung berbalas dengan admin (bukan lagi WhatsApp).
        if (res.data?.id) {
          setOpen(false);
          router.push(`${supportBasePath(activeRole)}/${res.data.id}`);
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
        className={`inline-flex items-center gap-1 text-xs text-brand-gray-450 hover:text-brand-red ${className}`}
      >
        {showIcon && <Flag className="w-3.5 h-3.5" />} {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Laporkan" maxWidthClass="max-w-md">
        {done ? (
          <div className="py-6 text-center">
            <p className="text-sm text-brand-gray-900 mb-4">
              Terima kasih. Laporan Anda telah dikirim dan akan ditinjau tim kami.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded bg-brand-red text-white text-sm"
            >
              Tutup
            </button>
          </div>
        ) : (
          <>
            <label className="block text-xs font-medium text-brand-gray-700 mb-1">Alasan</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-brand-gray-100 rounded px-3 py-2 text-sm mb-3"
            >
              {reasonOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <label className="block text-xs font-medium text-brand-gray-700 mb-1">
              Detail (opsional)
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full border border-brand-gray-100 rounded px-3 py-2 text-sm mb-3"
              placeholder="Jelaskan masalahnya…"
            />

            {error && <p className="text-xs text-brand-error mb-2">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded border border-brand-gray-100 text-sm"
              >
                Batal
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="px-4 py-2 rounded bg-brand-red text-white text-sm disabled:opacity-50"
              >
                {busy ? 'Mengirim…' : 'Kirim Laporan'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
