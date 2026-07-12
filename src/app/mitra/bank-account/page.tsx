"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';
import { ROLE_PARTNER } from '@/lib/constants';
import { getErrorMessage } from '@/types/api';


const BANKS = [
  { code: 'BCA', name: 'BCA' },
  { code: 'MANDIRI', name: 'Mandiri' },
  { code: 'BNI', name: 'BNI' },
  { code: 'BRI', name: 'BRI' },
];

export default function MitraBankAccountPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    bank_code: 'BCA',
    account_number: '',
    account_name: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    
    
    fetchBankAccount();
  }, [isAuthenticated, user?.active_role]);

  const fetchBankAccount = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/partners/me/bank-account');
    if (res.success && res.data) {
      setForm({
        bank_code: res.data.bank_code || 'BCA',
        account_number: res.data.account_number || '',
        account_name: res.data.account_name || '',
      });
    }
    setLoading(false);
  };

  const handleInitiateSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_number || !form.account_name) {
      setError('Mohon lengkapi semua kolom');
      return;
    }

    setSaving(true);
    const res = await fetchAPI('/partners/me/bank-account/request-otp', { method: 'POST' });
    setSaving(false);

    if (res.success) {
      setError('');
      setShowOtp(true);
      setOtp('');
      showToast('OTP berhasil dikirim (Gunakan 123456)');
    } else {
      setError(getErrorMessage(res));
    }
  };

  const handleConfirmOtp = async () => {
    if (otp.length < 4) {
      setError('Kode OTP tidak valid');
      return;
    }
    setShowOtp(false);
    
    setSaving(true);
    setError('');

    const res = await fetchAPI('/partners/me/bank-account', {
      method: 'PUT',
      body: JSON.stringify({ ...form, otp })
    });

    if (res.success) {
      showToast('Rekening bank berhasil disimpan!');
    } else {
      setError(getErrorMessage(res));
    }
    
    setSaving(false);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-[#38A169]' : 'bg-[#E53E3E]'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Rekening Bank Utama</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-[#e5e2e1] p-6 mb-6 text-center">
          <div className="w-16 h-16 bg-[#F0FFF4] rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-[#38A169]" />
          </div>
          <h2 className="text-lg font-bold text-[#1c1b1b] mb-2">Pencairan Dana</h2>
          <p className="text-sm text-[#5b403e]">
            Rekening ini akan menjadi tujuan utama saat Anda melakukan penarikan dana dari Dompet Posko.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-[#e5e2e1] p-6 h-64 animate-pulse" />
        ) : (
          <form onSubmit={handleInitiateSave} className="bg-white rounded-xl border border-[#e5e2e1] p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Pilih Bank</label>
              <select
                value={form.bank_code}
                onChange={e => setForm({ ...form, bank_code: e.target.value })}
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] bg-white"
              >
                {BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Nomor Rekening</label>
              <input
                type="text"
                value={form.account_number}
                onChange={e => setForm({ ...form, account_number: e.target.value.replace(/\D/g, '') })}
                placeholder="Hanya angka"
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Nama Pemilik Rekening</label>
              <input
                type="text"
                value={form.account_name}
                onChange={e => setForm({ ...form, account_name: e.target.value.toUpperCase() })}
                placeholder="SESUAI BUKU TABUNGAN"
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] uppercase"
              />
              <p className="text-xs text-[#9e8e8c] mt-2">
                Pastikan nama sesuai dengan yang terdaftar di bank untuk menghindari kegagalan transfer.
              </p>
            </div>

            {error && <div className="bg-[#FFF5F5] text-[#E53E3E] text-sm p-3 rounded-lg border border-[#FEB2B2]">{error}</div>}

            <div className="pt-4 border-t border-[#e5e2e1]">
              <Button
                className="w-full bg-[#b51822] hover:bg-[#90121a] rounded h-12 text-base font-bold"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Menyimpan...' : 'Simpan Rekening'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* OTP Modal */}
      {showOtp && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-[#1c1b1b] mb-2">Verifikasi Keamanan</h3>
            <p className="text-sm text-[#5b403e] mb-6">
              Masukkan 6 digit kode OTP (Gunakan: 123456) untuk menyetujui perubahan rekening.
            </p>
            
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl tracking-widest p-3 border border-[#e5e2e1] rounded-lg mb-6 focus:outline-none focus:border-[#b51822] font-mono"
              placeholder="••••••"
              autoFocus
            />

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowOtp(false)}
              >
                Batal
              </Button>
              <Button 
                className="flex-1 bg-[#b51822] hover:bg-[#90121a]" 
                onClick={handleConfirmOtp}
                disabled={otp.length < 4}
              >
                Konfirmasi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

