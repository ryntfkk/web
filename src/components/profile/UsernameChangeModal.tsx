'use client';

import { useState } from 'react';
import { X, AtSign, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

interface UsernameChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  /** Akun Google tanpa password melewati konfirmasi kata sandi (sesi jadi bukti). */
  hasPassword: boolean;
  /** Mitra punya URL profil publik `/{username}` yang ikut berubah . beri peringatan. */
  isPartner?: boolean;
}

/**
 * Ganti username. Digerbang konfirmasi kata sandi (BUKAN OTP): username tak
 * punya channel eksternal untuk dibuktikan, yang relevan hanya "benar pemilik
 * akun ini". Backend: `PUT /users/me/username` memvalidasi bentuk + kata
 * terlarang + keunikan, lalu memverifikasi kata sandi (dilewati bila akun Google
 * tanpa password).
 */
export default function UsernameChangeModal({
  isOpen,
  onClose,
  currentUsername,
  hasPassword,
  isPartner = false,
}: UsernameChangeModalProps) {
  const [username, setUsername] = useState(currentUsername);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleClose = () => {
    if (saving) return;
    // Reset ke keadaan awal agar percobaan berikutnya tidak membawa sisa input.
    setUsername(currentUsername);
    setPassword('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed === currentUsername) {
      setError('Username baru sama dengan yang sekarang');
      return;
    }
    if (hasPassword && !password) {
      setError('Masukkan kata sandi untuk konfirmasi');
      return;
    }

    setSaving(true);
    setError('');

    const res = await fetchAPI<{ username?: string }>('/users/me/username', {
      method: 'PUT',
      body: JSON.stringify({ username: trimmed, password }),
    });

    setSaving(false);

    if (res.success) {
      // Pakai nilai kanonik dari server (sudah di-trim) bila ada.
      const saved = res.data?.username ?? trimmed;
      useAuthStore.getState().updateUser({ username: saved });
      showToast('Username berhasil diperbarui');
      setPassword('');
      setError('');
      onClose();
    } else {
      setError(res.message || 'Gagal memperbarui username');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-brand-gray-100 bg-brand-gray-60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-red/10 rounded-full text-brand-red">
              <AtSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-brand-gray-900 text-base">Ubah Username</h3>
              <p className="text-xs text-brand-gray-400">Dipakai untuk masuk ke akun</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-brand-gray-400 hover:bg-black/5 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-1">Username Baru</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400 text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
                className="w-full p-3 pl-8 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                placeholder="username123"
              />
            </div>
            <p className="text-xs text-brand-gray-450 mt-1">
              3.30 karakter. Huruf, angka, titik, garis bawah, atau strip.
            </p>
          </div>

          {hasPassword && (
            <div>
              <label className="block text-sm font-semibold text-brand-gray-900 mb-1">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-brand-gray-450 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full p-3 pl-10 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                  placeholder="Masukkan kata sandi untuk konfirmasi"
                />
              </div>
            </div>
          )}

          {isPartner && (
            <p className="text-xs text-brand-warning-dark bg-brand-warning-soft border border-brand-warning-border rounded-lg p-3">
              Mengubah username juga mengubah tautan profil publikmu
              (poskojasa.com/{currentUsername}). Tautan lama tidak berlaku lagi.
            </p>
          )}

          {error && (
            <div className="bg-brand-error-soft text-brand-error text-sm p-3 rounded-lg border border-brand-error-border">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} type="button" disabled={saving}>
              Batal
            </Button>
            <Button className="flex-1 bg-brand-red hover:bg-brand-red-dark" type="submit" isLoading={saving}>
              Simpan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
