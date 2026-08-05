"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, User, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/hooks/useAuth';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';

interface SwitchRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SwitchRoleModal({ isOpen, onClose }: SwitchRoleModalProps) {
  const { user, switchRole } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSwitch = async (targetRole: 'customer' | 'partner') => {
    if (user.active_role === targetRole) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    // Jangan percaya store untuk partner_id . bisa basi setelah reload.
    // Verifikasi ke server sebelum menyimpulkan user belum terdaftar mitra.
    if (targetRole === 'partner' && !user.partner_id) {
      const check = await fetchAPI<any>('/partners/me');
      if (!check.success || !check.data) {
        // Benar-benar belum terdaftar → arahkan ke pendaftaran
        setLoading(false);
        onClose();
        router.push('/mitra/register');
        return;
      }
      // Terdaftar (status apa pun) → lanjutkan switch; guard/halaman mitra
      // yang menangani status PENDING/REJECTED.
    }

    const res = await switchRole(targetRole);
    setLoading(false);

    if (!res?.success) {
      // JANGAN navigasi saat gagal . tampilkan error agar user tahu.
      setError(getErrorMessage(res ?? { success: false }));
      return;
    }

    onClose();
    // Redirect to respective dashboard
    if (targetRole === 'partner') {
      router.push('/mitra/dashboard');
    } else {
      router.push('/');
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Pilih Mode Akun">
      <div className="space-y-3">
        <button
          onClick={() => handleSwitch('customer')}
          disabled={loading}
          className={`w-full p-4 rounded-xl border flex items-center justify-between transition-colors ${user.active_role === 'customer'
              ? 'border-brand-red bg-brand-error-soft'
              : 'border-brand-gray-100 bg-white hover:border-brand-red/50'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.active_role === 'customer' ? 'bg-brand-red text-white' : 'bg-brand-gray-60 text-brand-gray-700'}`}>
              <User className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-brand-gray-900">Mode Pelanggan</p>
              <p className="text-xs text-brand-gray-450">Cari dan pesan layanan</p>
            </div>
          </div>
          {user.active_role === 'customer' && (
            <div className="w-4 h-4 rounded-full bg-brand-red flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          )}
        </button>

        <button
          onClick={() => handleSwitch('partner')}
          disabled={loading}
          className={`w-full p-4 rounded-xl border flex items-center justify-between transition-colors ${user.active_role === 'partner'
              ? 'border-brand-red bg-brand-error-soft'
              : 'border-brand-gray-100 bg-white hover:border-brand-red/50'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.active_role === 'partner' ? 'bg-brand-red text-white' : 'bg-brand-gray-60 text-brand-gray-700'}`}>
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-brand-gray-900">Mode Mitra</p>
              <p className="text-xs text-brand-gray-450">
                {user.partner_id ? 'Kelola pesanan dan layanan' : 'Daftar jadi mitra'}
              </p>
            </div>
          </div>
          {user.active_role === 'partner' && (
            <div className="w-4 h-4 rounded-full bg-brand-red flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          )}
        </button>
      </div>

      {loading && (
        <div className="mt-4 flex items-center justify-center text-sm text-brand-gray-700">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin text-brand-red" />
          Beralih mode...
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 bg-brand-error-soft text-brand-error text-sm p-3 rounded-lg border border-brand-error-border">
          Gagal beralih mode: {error}. Coba lagi.
        </div>
      )}
    </Modal>
  );
}
