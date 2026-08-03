"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';
import { useAuthStore } from '@/lib/store/authStore';

// Jalur hapus akun untuk pengguna sendiri — syarat Google Play.
//
// Sengaja seringkas mungkin: satu tombol, satu dialog, satu panggilan API.
// Yang TIDAK boleh dipangkas adalah keterangan "yang dihapus vs yang tetap
// disimpan" — Play mewajibkan aplikasi menyatakan data mana yang benar-benar
// hilang dan mana yang ditahan, dan itu juga yang membuat Kebijakan Privasi
// kita tidak berbohong.
export default function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hapus = async () => {
    setLoading(true);
    setError('');
    const res = await fetchAPI('/auth/account', { method: 'DELETE', credentials: 'include' });
    if (!res.success) {
      setError(getErrorMessage(res));
      setLoading(false);
      return;
    }
    useAuthStore.getState().logout();
    router.push('/login');
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-brand-error-border overflow-hidden mt-6">
        <div className="p-4">
          <h3 className="font-semibold text-brand-gray-900">Hapus Akun</h3>
          <p className="text-xs text-brand-gray-700 mt-1 leading-relaxed">
            Akun dinonaktifkan permanen dan kamu tidak bisa masuk lagi.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-brand-red text-brand-red text-sm font-semibold hover:bg-brand-red-soft transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Hapus Akun Saya
          </button>
        </div>
      </div>

      <Modal open={open} onClose={() => !loading && setOpen(false)} title="Hapus akun?" maxWidthClass="max-w-sm">
        <div className="space-y-4 text-sm">
          <p className="text-brand-gray-700">
            Tindakan ini tidak bisa dibatalkan. Kamu akan langsung keluar.
          </p>

          <div className="space-y-2 text-xs text-brand-gray-700">
            <p>
              <span className="font-semibold text-brand-gray-900">Dihapus:</span>{' '}
              nama, nomor HP, email, foto, dan data rekening.
            </p>
            <p>
              <span className="font-semibold text-brand-gray-900">Tetap disimpan:</span>{' '}
              riwayat pesanan, ulasan, dan dokumen verifikasi — untuk penyelesaian
              sengketa dan kewajiban pajak.{' '}
              <Link href="/privacy" className="text-brand-red font-medium hover:underline">
                Selengkapnya
              </Link>
            </p>
          </div>

          {error && (
            <p className="text-xs text-brand-red bg-brand-error-soft border border-brand-error-border rounded-lg p-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1 bg-brand-gray-100 text-brand-gray-900 hover:bg-brand-gray-200"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button className="flex-1 bg-brand-red hover:bg-brand-red-dark" onClick={hapus} disabled={loading}>
              {loading ? 'Menghapus...' : 'Hapus Akun'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
