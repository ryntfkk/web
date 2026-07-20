"use client";

import { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';


export default function SecurityPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.message || 'Gagal mengubah password');
    }
    
    setLoading(false);
  };

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      <MobilePageHeader title="Keamanan Akun" />

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b] mb-6">Keamanan Akun</h1>
        <div className="bg-white rounded-xl border border-[#e5e2e1] p-6 mb-6 text-center">
          <div className="w-16 h-16 bg-[#F0FFF4] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#38A169]" />
          </div>
          <h2 className="text-lg font-bold text-[#1c1b1b] mb-2">Ubah Password</h2>
          <p className="text-sm text-[#5b403e]">
            Gunakan password yang kuat dengan kombinasi huruf dan angka untuk keamanan akun Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e5e2e1] p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Password Saat Ini</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-[#9e8e8c] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="w-full p-3 pl-10 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
          </div>

          <hr className="border-[#e5e2e1]" />

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Password Baru</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-[#9e8e8c] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full p-3 pl-10 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Konfirmasi Password Baru</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-[#9e8e8c] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                className="w-full p-3 pl-10 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
          </div>

          {error && <div className="bg-[#FFF5F5] text-[#E53E3E] text-sm p-3 rounded-lg border border-[#FEB2B2]">{error}</div>}
          {success && <div className="bg-[#F0FFF4] text-[#38A169] text-sm p-3 rounded-lg border border-[#9AE6B4]">Password berhasil diubah.</div>}

          <div className="pt-4">
            <Button
              className="w-full bg-[#b51822] hover:bg-[#90121a] rounded h-12 text-base font-bold"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>

        {/* Login History */}
        <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden mt-6">
          <div className="p-4 border-b border-[#e5e2e1]">
            <h3 className="font-semibold text-[#32201f]">Riwayat Login Terbaru</h3>
          </div>
          <LoginHistoryList />
        </div>
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

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="p-4 text-center text-sm text-[#9e8e8c]">Memuat riwayat...</div>;
  }

  if (history.length === 0) {
    return <div className="p-4 text-center text-sm text-[#9e8e8c]">Belum ada riwayat login.</div>;
  }

  return (
    <div className="divide-y divide-[#e5e2e1]">
      {history.map((h, i) => {
        const ipStr = asText(h.ip_address);
        const uaStr = asText(h.user_agent);
        return (
        <div key={h.id || i} className="p-4 flex flex-col gap-1">
          <div className="flex justify-between items-start">
            <span className="font-medium text-sm text-[#1c1b1b]">
              {h.event_type === 'LOGIN' ? 'Login Berhasil' : h.event_type}
            </span>
            <span className="text-xs text-[#9e8e8c]">{formatDate(h.created_at)}</span>
          </div>
          <div className="text-xs text-[#5b403e] flex gap-2 mt-1">
            <span className="bg-[#f7f5f4] px-1.5 py-0.5 rounded border border-[#e5e2e1]">IP: {ipStr || '-'}</span>
          </div>
          {uaStr && <p className="text-xs text-[#9e8e8c] mt-1 truncate">{uaStr}</p>}
        </div>
        );
      })}
    </div>
  );
}

