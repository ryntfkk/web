"use client";

import { useState, useEffect } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import { formatDateShort } from '@/lib/format';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { useAuthStore } from '@/lib/store/authStore';
import DeleteAccountSection from '@/components/profile/DeleteAccountSection';


export default function SecurityPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  if (!isAuthorized) return null;

  // Akun yang lahir dari Google belum punya password sama sekali. Bagi mereka
  // ini alur SET password, bukan UBAH: memaksa "password saat ini" membuat
  // validasi klien menolak sebelum request pernah terkirim, sehingga user
  // terkunci di luar satu-satunya fitur yang bisa memberinya password.
  const isSettingPassword = user?.has_password === false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!isSettingPassword && !currentPassword) || !newPassword || !confirmPassword) {
      setError('Semua kolom wajib diisi');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password baru dan konfirmasi password tidak cocok');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter');
      return;
    }

    setLoading(true);
    setError('');
    
    const res = await fetchAPI('/users/security/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });

    if (res.success) {
      setSuccess(true);
      // Tanpa ini form tetap dalam mode "buat password" setelah berhasil.
      useAuthStore.getState().updateUser({ has_password: true });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.message || 'Gagal mengubah password');
    }
    
    setLoading(false);
  };

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      {/* titleAs="p": H1 halaman ada di badan konten . tanpa ini HTML memuat DUA H1 sekaligus (audit A6). */}
      <MobilePageHeader
        titleAs="p" title="Keamanan Akun" />

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-6">Keamanan Akun</h1>
        <div className="bg-white rounded-xl border border-brand-gray-100 p-6 mb-6 text-center">
          <div className="w-16 h-16 bg-brand-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-brand-success" />
          </div>
          <h2 className="text-lg font-bold text-brand-gray-900 mb-2">
            {isSettingPassword ? 'Buat Password' : 'Ubah Password'}
          </h2>
          <p className="text-sm text-brand-gray-700">
            {isSettingPassword
              ? 'Akun kamu dibuat lewat Google, jadi belum punya password. Buat password agar bisa masuk tanpa Google.'
              : 'Gunakan password yang kuat dengan kombinasi huruf dan angka untuk keamanan akun Anda.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-brand-gray-100 p-6 space-y-4">
          {!isSettingPassword && (
            <>
              <div>
                <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Password Saat Ini</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-brand-gray-450 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    className="w-full p-3 pl-10 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <hr className="border-brand-gray-100" />
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Password Baru</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-brand-gray-450 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full p-3 pl-10 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Konfirmasi Password Baru</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-brand-gray-450 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                className="w-full p-3 pl-10 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          {error && <div className="bg-brand-error-soft text-brand-error text-sm p-3 rounded-lg border border-brand-error-border">{error}</div>}
          {success && (
            <div className="bg-brand-success-soft text-brand-success text-sm p-3 rounded-lg border border-brand-success-border">
              {isSettingPassword
                ? 'Password berhasil dibuat. Kamu kini bisa masuk memakai username dan password.'
                : 'Password berhasil diubah.'}
            </div>
          )}

          <div className="pt-4">
            <Button
              className="w-full bg-brand-red hover:bg-brand-red-dark rounded h-12 text-base font-bold"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>

        {/* Login History */}
        <div className="bg-white rounded-xl border border-brand-gray-100 overflow-hidden mt-6">
          <div className="p-4 border-b border-brand-gray-100">
            <h3 className="font-semibold text-brand-gray-800">Riwayat Login Terbaru</h3>
          </div>
          <LoginHistoryList />
        </div>

        <DeleteAccountSection />
      </div>
    </div>
  );
}

function LoginHistoryList() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/users/me/login-history');
    if (res.success && Array.isArray(res.data)) {
      setHistory(res.data);
    }
    setLoading(false);
  };

  // Render aman: backend LAMA mengirim ip_address (pqtype.Inet) & user_agent
  // (sql.NullString) sebagai OBJEK JSON → dirender langsung membuat React crash
  // ("Objects are not valid as a React child") sehingga halaman blank/tak bisa
  // dibuka. Ambil string bila ada; abaikan bila masih objek.
  const asText = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') return (v as { String?: string }).String ?? '';
    return '';
  };

  if (loading) {
    return <div className="p-4 text-center text-sm text-brand-gray-450">Memuat riwayat...</div>;
  }

  if (history.length === 0) {
    return <div className="p-4 text-center text-sm text-brand-gray-450">Belum ada riwayat login.</div>;
  }

  return (
    <div className="divide-y divide-brand-gray-100">
      {history.map((h, i) => {
        const ipStr = asText(h.ip_address);
        const uaStr = asText(h.user_agent);
        return (
        <div key={h.id || i} className="p-4 flex flex-col gap-1">
          <div className="flex justify-between items-start">
            <span className="font-medium text-sm text-brand-gray-900">
              {h.event_type === 'LOGIN' ? 'Login Berhasil' : h.event_type}
            </span>
            <span className="text-xs text-brand-gray-450">{formatDateShort(h.created_at)}</span>
          </div>
          <div className="text-xs text-brand-gray-700 flex gap-2 mt-1">
            <span className="bg-brand-gray-60 px-1.5 py-0.5 rounded border border-brand-gray-100">IP: {ipStr || '-'}</span>
          </div>
          {uaStr && <p className="text-xs text-brand-gray-450 mt-1 truncate">{uaStr}</p>}
        </div>
        );
      })}
    </div>
  );
}

