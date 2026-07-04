"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Briefcase, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/authStore';

interface SwitchRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SwitchRoleModal({ isOpen, onClose }: SwitchRoleModalProps) {
  const { user, switchRole } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleSwitch = async (targetRole: 'customer' | 'mitra') => {
    if (user.activeRole === targetRole) {
      onClose();
      return;
    }

    if (targetRole === 'mitra' && !user.is_mitra_registered) {
      // Buka halaman pendaftaran mitra jika belum terdaftar
      router.push('/register-mitra');
      onClose();
      return;
    }

    setLoading(true);
    await switchRole(targetRole);
    setLoading(false);
    onClose();
    
    // Redirect to respective dashboard
    if (targetRole === 'mitra') {
      router.push('/mitra/dashboard');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-6 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
        <div className="flex items-start justify-between mb-6">
          <h3 className="text-lg font-bold text-[#1c1b1b]">Pilih Mode Akun</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#f7f5f4] rounded-full transition-colors">
            <X className="w-5 h-5 text-[#9e8e8c]" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleSwitch('customer')}
            disabled={loading}
            className={`w-full p-4 rounded-xl border flex items-center justify-between transition-colors ${
              user.activeRole === 'customer' 
                ? 'border-[#b51822] bg-[#FFF5F5]' 
                : 'border-[#e5e2e1] bg-white hover:border-[#b51822]/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.activeRole === 'customer' ? 'bg-[#b51822] text-white' : 'bg-[#f7f5f4] text-[#5b403e]'}`}>
                <User className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-[#1c1b1b]">Mode Pelanggan</p>
                <p className="text-xs text-[#9e8e8c]">Cari dan pesan layanan</p>
              </div>
            </div>
            {user.activeRole === 'customer' && (
              <div className="w-4 h-4 rounded-full bg-[#b51822] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            )}
          </button>

          <button
            onClick={() => handleSwitch('mitra')}
            disabled={loading}
            className={`w-full p-4 rounded-xl border flex items-center justify-between transition-colors ${
              user.activeRole === 'mitra' 
                ? 'border-[#b51822] bg-[#FFF5F5]' 
                : 'border-[#e5e2e1] bg-white hover:border-[#b51822]/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.activeRole === 'mitra' ? 'bg-[#b51822] text-white' : 'bg-[#f7f5f4] text-[#5b403e]'}`}>
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-[#1c1b1b]">Mode Mitra</p>
                <p className="text-xs text-[#9e8e8c]">
                  {user.is_mitra_registered ? 'Kelola pesanan dan layanan' : 'Daftar jadi mitra'}
                </p>
              </div>
            </div>
            {user.activeRole === 'mitra' && (
              <div className="w-4 h-4 rounded-full bg-[#b51822] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            )}
          </button>
        </div>

        {loading && (
          <div className="mt-4 flex items-center justify-center text-sm text-[#5b403e]">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin text-[#b51822]" />
            Beralih mode...
          </div>
        )}
      </div>
    </div>
  );
}
