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


const BANKS = [
  { code: 'BCA', name: 'BCA' },
  { code: 'MANDIRI', name: 'Mandiri' },
  { code: 'BNI', name: 'BNI' },
  { code: 'BRI', name: 'BRI' },
];

export default function MitraBankAccountPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth(ROLE_PARTNER);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_number || !form.account_name) {
      setError('Mohon lengkapi semua kolom');
      return;
    }

    setSaving(true);
    setError('');

    const res = await fetchAPI('/partners/me/bank-account', {
      method: 'PUT',
      body: JSON.stringify(form)
    });

    if (res.success) {
      showToast('Rekening bank berhasil disimpan!');
    } else {
      setError(res.message || 'Gagal menyimpan rekening bank');
    }
    
    setSaving(false);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-[#38A169]' : 'bg-[#E53E3E]'}`}>
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
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-[#e5e2e1] p-6 space-y-4">
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
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Menyimpan...' : 'Simpan Rekening'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
