"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import PhoneVerificationModal from '@/components/ui/PhoneVerificationModal';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { getErrorMessage } from '@/types/api';
import { PageSkeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/format';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';

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
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [success, setSuccess] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const platformConfig = usePlatformConfig();

  const [savedBank, setSavedBank] = useState<SavedBank | null>(null);

  const fetchBalance = useCallback(async () => {
    const res = await fetchAPI<any>('/wallet/balance');
    if (res.success && res.data) {
      // dgn payment page. Tanpa ini saldo bisa resolve ke 0 → semua penarikan
      // terblokir. Pakai available_balance (= balance - pending_withdrawal).
      const data = res.data;
      setWalletBalance(data?.available_balance ?? data?.balance ?? 0);
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

  useEffect(() => {
    if (isAuthorized) {
      fetchBalance();
      fetchSavedBank();
    }
  }, [isAuthorized, fetchBalance, fetchSavedBank]);

  const isSubmittingRef = useRef(false);

  if (authLoading) {
    return <PageSkeleton />;
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
    const minWithdrawal = platformConfig.min_transaction;
    const maxWithdrawal = platformConfig.max_withdrawal;
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10);

    if (!numAmount || numAmount < minWithdrawal) {
      setError(`Minimal penarikan ${formatPrice(minWithdrawal)}`);
      return;
    }
    if (numAmount > maxWithdrawal) {
      setError(`Maksimal penarikan ${formatPrice(maxWithdrawal)} per pengajuan`);
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
      <div className="page-h bg-brand-gray-60 flex flex-col justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-6 max-w-sm w-full mx-auto text-center">
          <div className="w-16 h-16 bg-brand-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <Landmark className="w-8 h-8 text-brand-success" />
          </div>
          <h2 className="text-xl font-bold text-brand-gray-900 mb-2">Penarikan Berhasil Diajukan</h2>
          <p className="text-sm text-brand-gray-700 mb-6">
            {platformConfig.profile?.withdrawal_sla
              ? `Dana akan masuk ke rekening kamu dalam ${platformConfig.profile.withdrawal_sla}.`
              : 'Dana akan masuk ke rekening kamu setelah pengajuan disetujui.'}
          </p>
          {/* replace: layar sukses ini transien — back dari dompet tidak boleh
              memantulkan pengguna kembali ke "Penarikan Berhasil" yang basi. */}
          <Button className="w-full bg-brand-red hover:bg-brand-red-dark rounded" onClick={() => router.replace('/mitra/wallet')}>
            Kembali ke Dompet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      <MobilePageHeader title="Tarik Dana" backHref="/mitra/wallet" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-6">Tarik Dana</h1>
        <div className="bg-brand-red text-white p-4 rounded-xl mb-6 shadow-sm">
          <p className="text-sm text-white/80 mb-1">Saldo Tersedia</p>
          <p className="text-2xl font-bold">{formatPrice(walletBalance)}</p>
        </div>

        {/* Server menolak penarikan tanpa nomor terverifikasi — nomor itu juga
            penjaga OTP saat mengganti rekening. Munculkan sebelum user mengisi
            nominal, bukan sebagai error di ujung. */}
        {user && !user.profile_complete && (
          <div className="mb-6 bg-brand-warning-soft border border-brand-warning-border rounded-xl p-4">
            <p className="text-sm font-semibold text-brand-gray-900">Verifikasi nomor HP dulu</p>
            <p className="text-xs text-brand-gray-700 mt-0.5">
              Nomor WhatsApp terverifikasi diperlukan untuk menarik dana dan mengubah rekening.
            </p>
            <button
              type="button"
              onClick={() => setShowPhoneModal(true)}
              className="mt-2 text-xs font-bold text-brand-red hover:underline"
            >
              Verifikasi Sekarang
            </button>
          </div>
        )}

        <PhoneVerificationModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          onSuccess={() => setShowPhoneModal(false)}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-brand-gray-100 p-4">
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Nominal Penarikan</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-900 font-bold">Rp</span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full p-3 pl-10 border border-brand-gray-100 rounded text-lg font-bold text-brand-gray-900 focus:outline-none focus:border-brand-red"
              />
            </div>
            <p className="text-xs text-brand-gray-450 mt-2 flex items-center gap-1 mb-4">
              <AlertCircle className="w-3.5 h-3.5" /> Minimal {formatPrice(platformConfig.min_transaction)}
            </p>
            
            <div className="border-t border-brand-gray-100 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-brand-gray-700">
                <span>Biaya Admin</span>
                <span>{formatPrice(platformConfig.withdrawal_fee)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-brand-gray-900">
                <span>Total Diterima</span>
                <span>{amount ? formatPrice(Math.max(0, parseInt(amount.replace(/\D/g, ''), 10) - platformConfig.withdrawal_fee)) : 'Rp 0'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-brand-gray-100 p-4 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-brand-gray-900">Rekening Tujuan</h3>
              <button 
                type="button" 
                onClick={() => router.push('/mitra/bank-account')}
                className="text-sm font-semibold text-brand-red hover:underline"
              >
                Ubah Rekening
              </button>
            </div>
            
            {savedBank ? (
              <div className="bg-brand-gray-60 border border-brand-gray-100 p-4 rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-brand-gray-900">{savedBank.bank_name || savedBank.bank_code}</p>
                    <p className="text-sm text-brand-gray-700 font-mono mt-1">{savedBank.account_number || savedBank.bank_account_number}</p>
                    <p className="text-sm text-brand-gray-450 uppercase mt-0.5">{savedBank.account_name || savedBank.bank_account_name}</p>
                  </div>
                  <div className="bg-brand-success-soft text-brand-success text-[10px] font-bold px-2 py-1 rounded uppercase">
                    Tersimpan
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-brand-error-soft border border-brand-error-border p-4 rounded-xl text-center">
                <p className="text-sm text-brand-error font-medium mb-2">Rekening belum ditambahkan.</p>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/mitra/bank-account')}
                  className="w-full text-sm border-brand-error text-brand-error hover:bg-brand-error-soft"
                >
                  Tambah Rekening (Butuh OTP)
                </Button>
              </div>
            )}
          </div>

          {error && <div className="bg-brand-error-soft text-brand-error text-sm p-3 rounded-lg border border-brand-error-border">{error}</div>}

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full bg-brand-red hover:bg-brand-red-dark rounded h-12 text-base font-bold"
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

