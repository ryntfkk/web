'use client';

import { useState } from 'react';
import { Loader2, MailCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { getErrorMessage } from '@/types/api';

interface EmailVerificationFormProps {
  /** Dipanggil setelah email tersimpan & terverifikasi. */
  onSuccess: () => void;
  /** Tombol sekunder (mis. "Batal" di modal). */
  secondaryAction?: { label: string; onClick: () => void };
  /** Kalimat pembuka; default menjelaskan kebutuhan mitra. */
  reason?: string;
}

/**
 * Dua langkah verifikasi email: kirim kode -> cocokkan kode.
 *
 * Kembarannya PhoneVerificationForm, dan sengaja dibuat semirip mungkin . satu
 * pola OTP untuk seluruh aplikasi, bukan dua yang bisa saling menyimpang.
 *
 * Kodenya 6 digit, bukan tautan: seluruh alur lain (registrasi, reset password,
 * ganti nomor, penarikan) memakai 6 digit, dan layar yang sudah ada semuanya
 * memakai input yang sama.
 */
export default function EmailVerificationForm({
  onSuccess,
  secondaryAction,
  reason = 'Email diperlukan agar kami bisa mengabari status pendaftaran mitra dan pencairan dana kamu.',
}: EmailVerificationFormProps) {
  const { user, updateUser } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(user?.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Email wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAPI('/users/me/email/otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (res.success) {
        setStep(2);
      } else {
        setError(getErrorMessage(res));
      }
    } catch {
      setError('Gagal mengirim kode verifikasi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length < 6) {
      setError('Kode verifikasi harus 6 digit');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAPI('/users/me/email/verify', {
        method: 'POST',
        body: JSON.stringify({ email, otp: code }),
      });

      if (res.success) {
        updateUser({ email, email_verified: true });
        onSuccess();
      } else {
        setError(getErrorMessage(res));
      }
    } catch {
      setError('Gagal memverifikasi email. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 text-xs text-brand-gray-700 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
        <MailCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>{reason}</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-xs border border-red-100 font-medium">
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label
              htmlFor="verify-email"
              className="block text-xs font-semibold text-brand-gray-900 mb-1"
            >
              Alamat Email
            </label>
            <input
              id="verify-email"
              type="email"
              required
              autoComplete="email"
              placeholder="nama@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              disabled={loading || !email}
              className="bg-brand-red hover:bg-brand-red-dark text-xs font-bold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : 'Kirim Kode'}
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label
              htmlFor="verify-email-code"
              className="block text-xs font-semibold text-brand-gray-900 mb-1"
            >
              Kode 6 digit yang dikirim ke {email}
            </label>
            <input
              id="verify-email-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              required
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-xl tracking-[0.4em] px-3 py-2.5 border border-brand-gray-100 rounded-lg focus:outline-none focus:border-brand-red"
            />
            <p className="mt-1.5 text-[11px] text-brand-gray-450">
              Tidak menerima email? Cek folder Spam/Promosi. Kode berlaku 15 menit.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setCode('');
                setError(null);
              }}
              className="text-xs text-brand-gray-400 hover:text-brand-gray-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ganti Email
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
                disabled={loading || code.length < 6}
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
