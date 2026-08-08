'use client';

import { X, Mail } from 'lucide-react';
import EmailVerificationForm from '@/components/auth/EmailVerificationForm';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subtitle?: string;
  reason?: string;
}

/**
 * Pembungkus dialog tipis di atas EmailVerificationForm . kembaran
 * PhoneVerificationModal. Seluruh logikanya tinggal di form itu.
 */
export default function EmailVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  subtitle = 'Diperlukan untuk mendaftar sebagai mitra',
  reason,
}: EmailVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-brand-gray-100 bg-brand-gray-60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-red/10 rounded-full text-brand-red">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-brand-gray-900 text-base">Verifikasi Email</h3>
              <p className="text-xs text-brand-gray-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-1 rounded-full text-brand-gray-400 hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <EmailVerificationForm
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
            secondaryAction={{ label: 'Batal', onClick: onClose }}
            reason={reason}
          />
        </div>
      </div>
    </div>
  );
}
