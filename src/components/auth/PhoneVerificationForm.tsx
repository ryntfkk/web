'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { getErrorMessage } from '@/types/api';

interface PhoneVerificationFormProps {
  /** Dipanggil setelah nomor tersimpan & terverifikasi. */
  onSuccess: () => void;
  /** Tombol sekunder (mis. "Batal" di modal, "Nanti saja" di halaman). */
  secondaryAction?: { label: string; onClick: () => void };
}

/**
 * Dua langkah verifikasi nomor: kirim OTP -> cocokkan OTP.
 *
 * Dipakai bersama oleh PhoneVerificationModal (saat booking) dan halaman
 * /lengkapi-profil. Satu implementasi supaya alur OTP tidak dipelihara dua kali
 * dan tidak bisa menyimpang satu sama lain.
 */
export default function PhoneVerificationForm({
  onSuccess,
  secondaryAction,
}: PhoneVerificationFormProps) {
  const { updateUser } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone) {
      setError('Nomor HP wajib diisi');
      return;
    }

    setLoading(true);
    try {
      // Endpoint TERAUTENTIKASI, bukan /auth/otp/send. Endpoint publik itu untuk
      // pendaftaran: ia menolak nomor yang sudah terdaftar (jadi ganti nomor
      // mustahil) dan membocorkan nomor mana yang ada di sistem.
      const res = await fetchAPI('/users/me/phone/otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      if (res.success) {
        setStep(2);
      } else {
        setError(getErrorMessage(res));
      }
    } catch {
      setError('Gagal mengirim kode OTP. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length < 6) {
      setError('Kode OTP harus 6 digit');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAPI('/users/me/phone/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      });

      if (res.success) {
        updateUser({ phone, phone_verified: true, profile_complete: true });
        onSuccess();
      } else {
        setError(getErrorMessage(res));
      }
    } catch {
      setError('Gagal memverifikasi OTP. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 text-xs text-brand-gray-700 bg-brand-warning-soft border border-brand-warning-border p-3 rounded-lg flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-brand-warning shrink-0 mt-0.5" />
        <span>
          Nomor WhatsApp kamu diperlukan agar Mitra Posko Jasa dapat menghubungi lokasi saat
          pengerjaan.
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-brand-error-soft text-brand-error rounded-md text-xs border border-brand-error-border font-medium">
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label
              htmlFor="verify-phone"
              className="block text-xs font-semibold text-brand-gray-900 mb-1"
            >
              Nomor WhatsApp / HP
            </label>
            <input
              id="verify-phone"
              type="tel"
              required
              placeholder="08123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 border border-brand-gray-100 rounded-lg text-sm focus:outline-none focus:border-brand-red"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            {secondaryAction && (
              <Button
                type="button"
                variant="outline"
                onClick={secondaryAction.onClick}
                className="text-xs border-brand-gray-100"
              >
                {secondaryAction.label}
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading || !phone}
              className="bg-brand-red hover:bg-brand-red-dark text-xs font-bold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : 'Kirim Kode OTP'}
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label
              htmlFor="verify-otp"
              className="block text-xs font-semibold text-brand-gray-900 mb-1"
            >
              Kode OTP (6 Digit dikirim ke {phone})
            </label>
            <input
              id="verify-otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-xl tracking-[0.4em] px-3 py-2.5 border border-brand-gray-100 rounded-lg focus:outline-none focus:border-brand-red"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp('');
                setError(null);
              }}
              className="text-xs text-brand-gray-400 hover:text-brand-gray-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ganti Nomor
            </button>

            <div className="flex gap-2">
              {secondaryAction && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={secondaryAction.onClick}
                  className="text-xs border-brand-gray-100"
                >
                  {secondaryAction.label}
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading || otp.length < 6}
                className="bg-brand-red hover:bg-brand-red-dark text-xs font-bold"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  'Verifikasi & Simpan'
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
