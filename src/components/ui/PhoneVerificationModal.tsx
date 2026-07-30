'use client';

import { useState } from 'react';
import { X, Loader2, Phone, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { getErrorMessage } from '@/types/api';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhoneVerificationModal({
  isOpen,
  onClose,
  onSuccess,
}: PhoneVerificationModalProps) {
  const { updateUser } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone) {
      setError('Nomor HP wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAPI('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      if (res.success) {
        setStep(2);
      } else {
        setError(getErrorMessage(res));
      }
    } catch (err) {
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
        updateUser({ phone, phone_verified: true });
        onSuccess();
        onClose();
      } else {
        setError(getErrorMessage(res));
      }
    } catch (err) {
      setError('Gagal memverifikasi OTP. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-gray-100 bg-brand-gray-60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-red/10 rounded-full text-brand-red">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-brand-gray-900 text-base">Verifikasi Nomor HP</h3>
              <p className="text-xs text-brand-gray-400">Diperlukan untuk konfirmasi pesanan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-brand-gray-400 hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 text-xs text-brand-gray-700 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Nomor WhatsApp kamu diperlukan agar Mitra Posko Jasa dapat menghubungi lokasi saat pengerjaan.
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-xs border border-red-100 font-medium">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label htmlFor="modal-phone" className="block text-xs font-semibold text-brand-gray-900 mb-1">
                  Nomor WhatsApp / HP
                </label>
                <input
                  id="modal-phone"
                  type="tel"
                  required
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-brand-gray-100 rounded-lg text-sm focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="text-xs border-brand-gray-100"
                >
                  Batal
                </Button>
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
                <label htmlFor="modal-otp" className="block text-xs font-semibold text-brand-gray-900 mb-1">
                  Kode OTP (6 Digit dikirim ke {phone})
                </label>
                <input
                  id="modal-otp"
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
                  onClick={() => setStep(1)}
                  className="text-xs text-brand-gray-400 hover:text-brand-gray-900 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Ganti Nomor
                </button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="text-xs border-brand-gray-100"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="bg-brand-red hover:bg-brand-red-dark text-xs font-bold"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : 'Verifikasi & Simpan'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
