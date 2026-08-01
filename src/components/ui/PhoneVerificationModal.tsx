'use client';

import { X, Phone } from 'lucide-react';
import PhoneVerificationForm from '@/components/auth/PhoneVerificationForm';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Pembungkus dialog tipis di atas PhoneVerificationForm. Seluruh logika OTP
 * tinggal di form itu, dipakai bersama halaman /lengkapi-profil.
 */
export default function PhoneVerificationModal({
  isOpen,
  onClose,
  onSuccess,
}: PhoneVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
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

        <div className="p-6">
          <PhoneVerificationForm
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
            secondaryAction={{ label: 'Batal', onClick: onClose }}
          />
        </div>
      </div>
    </div>
  );
}
