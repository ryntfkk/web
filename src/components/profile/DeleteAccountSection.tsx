"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';
import { useAuthStore } from '@/lib/store/authStore';

// Jalur hapus akun untuk pengguna sendiri.
//
// Sebelumnya web sama sekali tidak punya UI ini, padahal Kebijakan Privasi
// menjanjikan "meminta penghapusan akun dan data terkait" dan Google Play
// mewajibkan jalur penghapusan di dalam aplikasi.
// Lihat PLAN-KONTEN-LEGAL-CMS.md §3.5 R3.
//
// Teksnya sengaja menyatakan APA ADANYA apa yang benar-benar terjadi di sistem:
// identitas dianonimkan, tetapi riwayat transaksi & dokumen verifikasi tetap
// disimpan. Menjanjikan "semua data dihapus" akan jadi pernyataan keliru —
// justru itu yang berisiko secara hukum, bukan retensinya.
const CONFIRM_PHRASE = 'HAPUS AKUN';

export default function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (loading) return;
    setOpen(false);
    setPhrase('');
    setError('');
  };

  const handleDelete = async () => {
    if (phrase.trim().toUpperCase() !== CONFIRM_PHRASE) {
      setError(`Ketik "${CONFIRM_PHRASE}" untuk mengonfirmasi.`);
      return;
    }
    setLoading(true);
    setError('');

    // Dua langkah: minta token konfirmasi, lalu pakai token itu untuk menghapus.
    const req = await fetchAPI<{ token: string }>('/auth/delete-request', {
      method: 'POST',
    });
    if (!req.success || !req.data?.token) {
      setError(getErrorMessage(req));
      setLoading(false);
      return;
    }

    const res = await fetchAPI('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ token: req.data.token }),
      credentials: 'include',
    });
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
        <div className="p-4 border-b border-brand-gray-100">
          <h3 className="font-semibold text-brand-gray-900">Hapus Akun</h3>
          <p className="text-xs text-brand-gray-700 mt-1 leading-relaxed">
            Akunmu dinonaktifkan permanen dan kamu tidak bisa masuk lagi. Riwayat
            transaksi, ulasan, dan dokumen verifikasi tetap kami simpan selama
            masa retensi untuk penyelesaian sengketa dan kewajiban pajak.
          </p>
        </div>
        <div className="p-4">
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-brand-red text-brand-red text-sm font-semibold hover:bg-brand-red-soft transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Hapus Akun Saya
          </button>
        </div>
      </div>

      <Modal open={open} onClose={close} title="Hapus akun permanen?" maxWidthClass="max-w-md">
        <div className="space-y-4">
          <div className="flex gap-2.5 p-3 rounded-lg bg-brand-error-soft border border-brand-error-border">
            <AlertTriangle className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
            <p className="text-xs text-brand-red leading-relaxed">
              Tindakan ini tidak bisa kamu batalkan sendiri. Kamu akan langsung
              keluar dan tidak bisa masuk kembali dengan akun ini.
            </p>
          </div>

          <div className="text-sm text-brand-gray-700 space-y-2">
            <p className="font-semibold text-brand-gray-900">Yang dihapus:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
              <li>Nama, nomor HP, email, foto profil, dan data rekening di profilmu</li>
              <li>Akses masuk — semua sesi dicabut</li>
              <li>Layananmu tidak lagi tampil di pencarian</li>
            </ul>

            <p className="font-semibold text-brand-gray-900 pt-1">Yang tetap kami simpan:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
              <li>Riwayat pesanan, pembayaran, dan mutasi dompet</li>
              <li>Ulasan, percakapan, dan berkas sengketa</li>
              <li>Dokumen verifikasi mitra (KTP &amp; swafoto), bila kamu mitra</li>
            </ul>
            <p className="text-xs text-brand-gray-450 leading-relaxed pt-1">
              Data itu disimpan untuk menyelesaikan sengketa atas pekerjaan yang
              sudah berjalan dan memenuhi kewajiban pembukuan &amp; pajak — bukan
              untuk dipakai memasarkan apa pun kepadamu. Rinciannya ada di{' '}
              <Link href="/privacy" className="text-brand-red font-medium hover:underline">
                Kebijakan Privasi
              </Link>
              .
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-gray-900 mb-1.5">
              Ketik <span className="text-brand-red">{CONFIRM_PHRASE}</span> untuk mengonfirmasi
            </label>
            <input
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoComplete="off"
              className="w-full p-3 border border-brand-gray-100 rounded-lg text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
              placeholder={CONFIRM_PHRASE}
            />
          </div>

          {error && (
            <p className="text-xs text-brand-red bg-brand-error-soft border border-brand-error-border rounded-lg p-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1 bg-brand-gray-100 text-brand-gray-900 hover:bg-brand-gray-200"
              onClick={close}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              className="flex-1 bg-brand-red hover:bg-brand-red-dark"
              onClick={handleDelete}
              disabled={loading || phrase.trim().toUpperCase() !== CONFIRM_PHRASE}
            >
              {loading ? 'Menghapus...' : 'Hapus Akun'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
