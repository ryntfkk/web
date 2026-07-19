"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { getErrorMessage } from '@/types/api';
import { Loader2 } from 'lucide-react';

interface SavedBank {
  bank_code?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  // Alias penamaan alternatif dari sebagian endpoint.
  bank_account_number?: string;
  bank_account_name?: string;
}


export default function WithdrawPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<{min_transaction: number, withdrawal_fee: number, max_withdrawal: number} | null>(null);

  const [savedBank, setSavedBank] = useState<SavedBank | null>(null);

  const fetchBalance = useCallback(async () => {
    const res = await fetchAPI<any>('/wallet/balance');
    if (res.success && res.data) {
      // Pakai available_balance (= balance - pending_withdrawal) agar tidak
      // mengizinkan penarikan atas dana yang sudah dikunci penarikan lain.
      setWalletBalance(res.data.available_balance ?? res.data.balance ?? 0);
    } else {
      setWalletBalance(user?.balance || 0);
    }
  }, [user?.balance]);

  const fetchSavedBank = useCallback(async () => {
    const res = await fetchAPI<any>('/partners/me/bank-account');
    if (res.success && res.data) {
      setSavedBank(res.data);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    const res = await fetchAPI<any>('/config');
    if (res.success && res.data) {
      setPlatformConfig(res.data);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchBalance();
      fetchSavedBank();
      fetchConfig();
    }
  }, [isAuthorized, fetchBalance, fetchSavedBank, fetchConfig]);

  const isSubmittingRef = useRef(false);

  if (authLoading) {
    return (
      <div className="page-h flex items-center justify-center bg-[#f7f5f4]">
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

    // Validasi dulu, baru kunci submit — mengunci sebelum validasi membuat
    // form mati permanen setelah satu kali error validasi (ref tidak pernah
    // di-reset di jalur early-return).
    const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
    const minWithdrawal = platformConfig?.min_transaction || 50000;
    const maxWithdrawal = platformConfig?.max_withdrawal || 10000000;
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10);

    if (!numAmount || numAmount < minWithdrawal) {
      setError(`Minimal penarikan ${fmtIDR(minWithdrawal)}`);
      return;
    }
    if (numAmount > maxWithdrawal) {
      setError(`Maksimal penarikan ${fmtIDR(maxWithdrawal)} per pengajuan`);
      return;
    }
    if (numAmount > walletBalance) {
      setError('Saldo tidak mencukupi');
      return;
    }
    if (!savedBank) {
      setError('Silakan tambahkan rekening bank terlebih dahulu');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');

    // Backend WithdrawRequest hanya menerima { amount } — rekening tujuan
    // memakai rekening tersimpan (mengubahnya butuh OTP).
    const res = await fetchAPI('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount: numAmount }),
    });

    if (res.success) {
      setSuccess(true);
    } else {
      const errCode = res.error && typeof res.error === 'object' ? (res.error as { code?: string }).code : undefined;
      if (errCode === 'WALLET_WITHDRAWAL_PENDING') {
        setError('Masih ada penarikan yang sedang diproses. Tunggu hingga selesai sebelum mengajukan lagi.');
      } else if (errCode === 'WALLET_INSUFFICIENT_BALANCE') {
        setError('Saldo tidak mencukupi.');
      } else {
        setError(getErrorMessage(res));
      }
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
      <div className="page-h bg-[#f7f5f4] flex flex-col justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e2e1] p-6 max-w-sm w-full mx-auto text-center">
          <div className="w-16 h-16 bg-[#F0FFF4] rounded-full flex items-center justify-center mx-auto mb-4">
            <Landmark className="w-8 h-8 text-[#38A169]" />
          </div>
          <h2 className="text-xl font-bold text-[#1c1b1b] mb-2">Penarikan Berhasil Diajukan</h2>
          <p className="text-sm text-[#5b403e] mb-6">
            Dana akan masuk ke rekening Anda dalam 1-2 hari kerja.
          </p>
          {/* replace: layar sukses ini transien — back dari dompet tidak boleh
              memantulkan pengguna kembali ke "Penarikan Berhasil" yang basi. */}
          <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => router.replace('/mitra/wallet')}>
            Kembali ke Dompet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      <MobilePageHeader title="Tarik Dana" backHref="/mitra/wallet" />

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b] mb-6">Tarik Dana</h1>
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
            <p className="text-xs text-[#9e8e8c] mt-2 flex items-center gap-1 mb-4">
              <AlertCircle className="w-3.5 h-3.5" /> Minimal {formatPrice(platformConfig?.min_transaction || 50000)}
            </p>
            
            <div className="border-t border-[#e5e2e1] pt-3 space-y-2">
              <div className="flex justify-between text-sm text-[#5b403e]">
                <span>Biaya Admin</span>
                <span>{formatPrice(platformConfig?.withdrawal_fee || 3000)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#1c1b1b]">
                <span>Total Diterima</span>
                <span>{amount ? formatPrice(Math.max(0, parseInt(amount.replace(/\D/g, ''), 10) - (platformConfig?.withdrawal_fee || 3000))) : 'Rp 0'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-[#1c1b1b]">Rekening Tujuan</h3>
              <button 
                type="button" 
                onClick={() => router.push('/mitra/bank-account')}
                className="text-sm font-semibold text-[#b51822] hover:underline"
              >
                Ubah Rekening
              </button>
            </div>
            
            {savedBank ? (
              <div className="bg-[#f7f5f4] border border-[#e5e2e1] p-4 rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#1c1b1b]">{savedBank.bank_name || savedBank.bank_code}</p>
                    <p className="text-sm text-[#5b403e] font-mono mt-1">{savedBank.account_number || savedBank.bank_account_number}</p>
                    <p className="text-sm text-[#9e8e8c] uppercase mt-0.5">{savedBank.account_name || savedBank.bank_account_name}</p>
                  </div>
                  <div className="bg-[#E5F3EB] text-[#38A169] text-[10px] font-bold px-2 py-1 rounded uppercase">
                    Tersimpan
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#FFF5F5] border border-[#FEB2B2] p-4 rounded-xl text-center">
                <p className="text-sm text-[#E53E3E] font-medium mb-2">Rekening belum ditambahkan.</p>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/mitra/bank-account')}
                  className="w-full text-sm border-[#E53E3E] text-[#E53E3E] hover:bg-[#FFF5F5]"
                >
                  Tambah Rekening (Butuh OTP)
                </Button>
              </div>
            )}
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

