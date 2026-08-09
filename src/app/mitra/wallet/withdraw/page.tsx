"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, AlertCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { track } from '@/lib/analytics';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import PhoneVerificationModal from '@/components/ui/PhoneVerificationModal';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
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

  // H4: OTP withdrawal. Alur: user isi nominal → kirim OTP → input OTP → submit.
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0); // detik sampai bisa kirim ulang

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

  // Cooldown timer untuk kirim ulang OTP (60 detik).
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  const isSubmittingRef = useRef(false);

  if (authLoading) {
    return <PageSkeleton />;
  }

  if (!isAuthorized) {
    return null;
  }

  // H4: Kirim OTP ke nomor HP terverifikasi user. Dipanggil sebelum submit
  // withdrawal. Rate limit backend: 3 request / 15 menit.
  const sendOtp = async () => {
    // Validasi amount dulu supaya OTP tidak dikirim untuk nominal yang akan
    // ditolak anyway.
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

    setOtpSending(true);
    setError('');
    const res = await fetchAPI('/wallet/withdraw/otp', { method: 'POST' });
    setOtpSending(false);

    if (res.success) {
      setOtpSent(true);
      setOtpCooldown(60);
      setOtp('');
    } else {
      setError(getErrorMessage(res));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    // Validasi dulu, baru kunci submit . mengunci sebelum validasi membuat
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
    // H4: OTP wajib . backend menolak tanpa OTP.
    if (!otpSent) {
      setError('Klik "Kirim Kode OTP" terlebih dahulu untuk verifikasi penarikan.');
      return;
    }
    if (!otp || otp.length !== 6) {
      setError('Masukkan 6 digit kode OTP yang dikirim ke nomor HP Anda.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');

    // Backend WithdrawRequest menerima { amount, otp } . rekening tujuan
    // memakai rekening tersimpan (mengubahnya butuh OTP).
    const res = await fetchAPI('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount: numAmount, otp }),
    });

    if (res.success) {
      // Jumlahnya ikut karena itu dimensi produk yang sah; nomor rekening
      // TIDAK . lihat daftar terlarang di lib/analytics.ts (§12.1).
      track('partner_withdrawal_submitted', { amount: numAmount });
      setSuccess(true);
    } else {
      const errCode = res.error && typeof res.error === 'object' ? (res.error as { code?: string }).code : undefined;
      if (errCode === 'WALLET_WITHDRAWAL_PENDING') {
        setError('Masih ada penarikan yang sedang diproses. Tunggu hingga selesai sebelum mengajukan lagi.');
      } else if (errCode === 'WALLET_INSUFFICIENT_BALANCE') {
        setError('Saldo tidak mencukupi.');
      } else if (errCode === 'OTP_INVALID' || errCode === 'OTP_SEND_FAILED') {
        setError('Kode OTP salah atau kadaluarsa. Silakan minta OTP baru.');
        setOtpSent(false);
        setOtp('');
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
      <div className="flex min-h-[70vh] flex-col justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm border border-brand-gray-100 p-6 max-w-sm w-full mx-auto text-center">
          <div className="w-16 h-16 bg-brand-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <Landmark className="w-8 h-8 text-brand-success" />
          </div>
          <h2 className="text-xl font-bold text-brand-gray-900 mb-2">Penarikan Berhasil Diajukan</h2>
          <p className="text-sm text-brand-gray-700 mb-6">
            {platformConfig.profile?.withdrawal_sla
              ? `Dana akan masuk ke rekening kamu dalam ${platformConfig.profile.withdrawal_sla}.`
              : 'Dana akan masuk ke rekening kamu setelah pengajuan disetujui.'}
          </p>
          {/* replace: layar sukses ini transien . back dari dompet tidak boleh
              memantulkan pengguna kembali ke "Penarikan Berhasil" yang basi. */}
          <Button className="w-full bg-brand-red hover:bg-brand-red-dark rounded-md" onClick={() => router.replace('/mitra/wallet')}>
            Kembali ke Dompet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <MitraPageHeader
        title="Tarik Dana"
        variant="form"
        backHref="/mitra/wallet"
        breadcrumbs={[{ label: 'Dompet', href: '/mitra/wallet' }, { label: 'Tarik Dana' }]}
      />

      {/* Tidak ada <h1> kedua di sini: MitraPageHeader sudah `alwaysShow`, jadi
          judulnya tampil di desktop juga . dua-duanya berarti dua H1. */}
      <MitraPageContainer variant="form">
        <div className="bg-brand-red text-white p-4 rounded-lg mb-6 shadow-sm">
          <p className="text-sm text-white/80 mb-1">Saldo Tersedia</p>
          <p className="text-2xl font-bold">{formatPrice(walletBalance)}</p>
        </div>

        {/* Server menolak penarikan tanpa nomor terverifikasi . nomor itu juga
            penjaga OTP saat mengganti rekening. Munculkan sebelum user mengisi
            nominal, bukan sebagai error di ujung. */}
        {user && !user.profile_complete && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-brand-warning-border bg-brand-warning-soft p-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand-warning" />
              <div>
                <p className="text-[13px] font-bold text-brand-gray-900">Verifikasi nomor HP dulu</p>
                <p className="mt-0.5 text-[11px] leading-snug text-brand-gray-700">
                  Dibutuhkan untuk menarik dana dan mengubah rekening.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPhoneModal(true)}
              className="shrink-0 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-red-dark active:scale-95"
            >
              Verifikasi
            </button>
          </div>
        )}

        <PhoneVerificationModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          onSuccess={() => setShowPhoneModal(false)}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg border border-brand-gray-100 p-4">
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Nominal Penarikan</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-900 font-bold">Rp</span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full p-3 pl-10 border border-brand-gray-100 rounded-md text-lg font-bold text-brand-gray-900 focus:outline-none focus:border-brand-red"
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

          <div className="bg-white rounded-lg border border-brand-gray-100 p-4 space-y-4">
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
              <div className="bg-brand-gray-60 border border-brand-gray-100 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-brand-gray-900">{savedBank.bank_name || savedBank.bank_code}</p>
                    <p className="text-sm text-brand-gray-700 font-mono mt-1">{savedBank.account_number || savedBank.bank_account_number}</p>
                    <p className="text-sm text-brand-gray-450 uppercase mt-0.5">{savedBank.account_name || savedBank.bank_account_name}</p>
                  </div>
                  <div className="bg-brand-success-soft text-brand-success text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                    Tersimpan
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-brand-error-soft border border-brand-error-border p-4 rounded-lg text-center">
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

          {/* H4: Verifikasi OTP sebelum penarikan. OTP dikirim ke nomor HP
              terverifikasi user via WhatsApp (Fonnte). */}
          <div className="bg-white rounded-lg border border-brand-gray-100 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-brand-gray-900 text-sm">Verifikasi Penarikan</h3>
                <p className="text-xs text-brand-gray-700 mt-0.5">
                  Demi keamanan, masukkan kode OTP yang dikirim ke nomor HP terverifikasi Anda.
                </p>
              </div>
            </div>

            {!otpSent ? (
              <Button
                type="button"
                variant="outline"
                onClick={sendOtp}
                disabled={otpSending || otpCooldown > 0}
                className="w-full rounded-md h-11 text-sm font-semibold border-brand-red text-brand-red hover:bg-brand-red/5"
              >
                {otpSending
                  ? 'Mengirim OTP...'
                  : otpCooldown > 0
                    ? `Kirim ulang dalam ${otpCooldown}s`
                    : 'Kirim Kode OTP'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 mb-1.5">
                    Kode OTP (6 digit)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="______"
                    className="w-full p-3 border border-brand-gray-100 rounded-md text-center text-2xl font-bold tracking-[0.5em] text-brand-gray-900 focus:outline-none focus:border-brand-red"
                  />
                </div>
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={otpSending || otpCooldown > 0}
                  className="text-xs font-semibold text-brand-red hover:underline disabled:text-brand-gray-400 disabled:no-underline"
                >
                  {otpCooldown > 0 ? `Kirim ulang dalam ${otpCooldown}s` : 'Kirim ulang OTP'}
                </button>
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full bg-brand-red hover:bg-brand-red-dark rounded-md h-12 text-base font-bold"
              disabled={loading || !otpSent || otp.length !== 6}
            >
              {loading ? 'Memproses...' : 'Tarik Dana'}
            </Button>
          </div>
        </form>
      </MitraPageContainer>
    </div>
  );
}

