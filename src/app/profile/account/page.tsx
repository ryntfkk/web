"use client";

import { User, Phone, Mail, Loader2 } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';

export default function AccountPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized || !user) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      <MobilePageHeader title="Informasi Akun" backHref="/profile" />

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b] mb-6">Informasi Akun</h1>

        <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden">
          <div className="p-4 border-b border-[#e5e2e1]">
            <h3 className="font-semibold text-[#32201f]">Informasi Akun</h3>
          </div>
          <div className="divide-y divide-[#e5e2e1]">
            <div className="w-full flex items-center p-4 text-left">
              <User className="w-5 h-5 text-[#8f6f6d] mr-3" />
              <div className="flex-1">
                <span className="text-[#32201f] font-medium block text-sm">Nama</span>
                <span className="text-xs text-[#8f6f6d]">{user.name}</span>
              </div>
            </div>
            <div className="w-full flex items-center p-4 text-left">
              <Phone className="w-5 h-5 text-[#8f6f6d] mr-3" />
              <div className="flex-1">
                <span className="text-[#32201f] font-medium block text-sm">Nomor HP</span>
                <span className="text-xs text-[#8f6f6d]">{user.phone}</span>
              </div>
            </div>
            <div className="w-full flex items-center p-4 text-left">
              <Mail className="w-5 h-5 text-[#8f6f6d] mr-3" />
              <div className="flex-1">
                <span className="text-[#32201f] font-medium block text-sm">Email</span>
                <span className="text-xs text-[#8f6f6d]">{user.email || 'Belum diisi'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
