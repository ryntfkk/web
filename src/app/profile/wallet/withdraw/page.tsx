"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Landmark, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


export default function WithdrawPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [bankCode, setBankCode] = useState('BCA');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const fetchBalance = useCallback(async () => {
    const res = await fetchAPI<any>('/wallet/balance');
    if (res.success && res.data) {
      setWalletBalance(res.data.balance ?? 0);
    } else {
      setWalletBalance(user?.balance || 0);
    }
  }, [user?.balance]);

  useEffect(() => {
    if (isAuthorized) {
      fetchBalance();
    }
  }, [isAuthorized, fetchBalance]);

  const BANKS = [
    { code: 'BCA', name: 'BCA' },
    { code: 'MANDIRI', name: 'Mandiri' },
    { code: 'BNI', name: 'BNI' },
    { code: 'BRI', name: 'BRI' },
    { code: 'GOPAY', name: 'GoPay' },
    { code: 'OVO', name: 'OVO' },
  ];

  const isSubmittingRef = useRef(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f5f4]">
        <Loader2 className="w-8 h-8 text-[#b51822] animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10);
    if (!numAmount || numAmount < 50000) {
      setError('Minimal penarikan Rp 50.000');
      return;
    }
    if (numAmount > walletBalance) {
      setError('Saldo tidak mencukupi');
      return;
    }
    if (!accountNumber || !accountName) {
      setError('Mohon lengkapi data rekening');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetchAPI('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount: numAmount,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
      })
    });

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.message || 'Gagal mengajukan penarikan');
    }
    
    setLoading(false);
    isSubmittingRef.current = false;
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers, then format
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setAmount('');
      return;
    }
    setAmount(new Intl.NumberFormat('id-ID').format(parseInt(val, 10)));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f7f5f4] flex flex-col justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e2e1] p-6 max-w-sm w-full mx-auto text-center">
          <div className="w-16 h-16 bg-[#F0FFF4] rounded-full flex items-center justify-center mx-auto mb-4">
            <Landmark className="w-8 h-8 text-[#38A169]" />
          </div>
          <h2 className="text-xl font-bold text-[#1c1b1b] mb-2">Penarikan Berhasil Diajukan</h2>
          <p className="text-sm text-[#5b403e] mb-6">
            Dana akan masuk ke rekening Anda dalam 1-2 hari kerja.
          </p>
          <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => router.push('/profile/wallet')}>
            Kembali ke Dompet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Tarik Dana</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-[#b51822] text-white p-4 rounded-xl mb-6 shadow-sm">
          <p className="text-sm text-white/80 mb-1">Saldo Tersedia</p>
          <p className="text-2xl font-bold">{formatPrice(walletBalance)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-[#e5e2e1] p-4">
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Nominal Penarikan</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c1b1b] font-bold">Rp</span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full p-3 pl-10 border border-[#e5e2e1] rounded text-lg font-bold text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
            <p className="text-xs text-[#9e8e8c] mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Minimal Rp 50.000
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 space-y-4">
            <h3 className="font-bold text-[#1c1b1b]">Rekening Tujuan</h3>
            
            <div>
              <label className="block text-sm font-semibold text-[#5b403e] mb-1.5">Bank / E-Wallet</label>
              <select
                value={bankCode}
                onChange={e => setBankCode(e.target.value)}
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] bg-white"
              >
                {BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#5b403e] mb-1.5">Nomor Rekening / HP</label>
              <input
                type="text"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#5b403e] mb-1.5">Nama Pemilik Rekening</label>
              <input
                type="text"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
          </div>

          {error && <div className="bg-[#FFF5F5] text-[#E53E3E] text-sm p-3 rounded-lg border border-[#FEB2B2]">{error}</div>}

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full bg-[#b51822] hover:bg-[#90121a] rounded h-12 text-base font-bold"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Tarik Dana'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
