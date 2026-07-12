"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, ShieldCheck, CreditCard, ChevronRight, LayoutDashboard, Package,
  Settings, LogOut, FileText, CheckCircle, RefreshCw, Image as ImageIcon, MapPin
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';
import { ROLE_PARTNER } from '@/lib/constants';
import { SwitchRoleModal } from '@/components/ui/switch-role-modal';


export default function MitraProfilePage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const logout = useAuthStore(s => s.logout);
  const { switchRole } = useAuth();
  const router = useRouter();

  const [verificationStatus, setVerificationStatus] = useState<string>('VERIFIED');
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  useEffect(() => {
    
    
    fetchProfile();
  }, [isAuthenticated, user?.active_role]);

  const fetchProfile = async () => {
    const res = await fetchAPI<any>('/partners/me');
    if (res.success && res.data) {
      setVerificationStatus(res.data.verification_status || 'VERIFIED');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header Profile Info */}
      <div className="bg-white border-b border-[#e5e2e1] pt-12 pb-6 px-4 mb-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#f7f5f4] flex items-center justify-center text-3xl font-bold text-[#b51822] overflow-hidden shrink-0 border-2 border-[#e5e2e1]">
            {user?.avatar_url ? <img src={user?.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1c1b1b]">{user?.name}</h1>
            <p className="text-sm text-[#5b403e]">{user?.phone}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                verificationStatus === 'VERIFIED' ? 'bg-[#F0FFF4] text-[#38A169]' :
                verificationStatus === 'PENDING' ? 'bg-[#FFFAF0] text-[#DD6B20]' :
                'bg-[#FFF5F5] text-[#E53E3E]'
              }`}>
                {verificationStatus === 'VERIFIED' && <CheckCircle className="w-3 h-3" />}
                {verificationStatus === 'VERIFIED' ? 'Terverifikasi' : verificationStatus === 'PENDING' ? 'Menunggu Verifikasi' : 'Ditolak'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Menu Group 1: Akun & Keamanan */}
        <div className="bg-white rounded-md border border-[#e5e2e1] overflow-hidden">
          <Link href="/mitra/verification-status" className="flex items-center justify-between p-4 border-b border-[#e5e2e1] hover:bg-[#f7f5f4] transition-colors">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#9e8e8c]" />
              <span className="font-semibold text-[#1c1b1b]">Status Verifikasi Dokumen</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9e8e8c]" />
          </Link>
          <Link href="/profile/security" className="flex items-center justify-between p-4 border-b border-[#e5e2e1] hover:bg-[#f7f5f4] transition-colors">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-[#9e8e8c]" />
              <span className="font-semibold text-[#1c1b1b]">Keamanan Akun</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9e8e8c]" />
          </Link>
          <Link href="/mitra/basecamp" className="flex items-center justify-between p-4 border-b border-[#e5e2e1] hover:bg-[#f7f5f4] transition-colors">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#9e8e8c]" />
              <span className="font-semibold text-[#1c1b1b]">Alamat Basecamp</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9e8e8c]" />
          </Link>
          <Link href="/mitra/bank-account" className="flex items-center justify-between p-4 border-b border-[#e5e2e1] hover:bg-[#f7f5f4] transition-colors">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-[#9e8e8c]" />
              <span className="font-semibold text-[#1c1b1b]">Rekening Bank</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9e8e8c]" />
          </Link>
          <Link href="/mitra/portfolio" className="flex items-center justify-between p-4 hover:bg-[#f7f5f4] transition-colors">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-[#9e8e8c]" />
              <span className="font-semibold text-[#1c1b1b]">Galeri Portofolio</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9e8e8c]" />
          </Link>
        </div>

        {/* Menu Group 2: Lainnya */}
        <div className="bg-white rounded-md border border-[#e5e2e1] overflow-hidden">
          <button
            onClick={() => setShowSwitchModal(true)}
            className="w-full flex items-center justify-between p-4 border-b border-[#e5e2e1] hover:bg-[#f7f5f4] transition-colors"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-[#b51822]" />
              <span className="font-semibold text-[#1c1b1b]">
                Beralih ke Mode Pelanggan
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9e8e8c]" />
          </button>
          <Link href="/terms" className="flex items-center justify-between p-4 border-b border-[#e5e2e1] hover:bg-[#f7f5f4] transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#9e8e8c]" />
              <span className="font-semibold text-[#1c1b1b]">Syarat & Ketentuan Mitra</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9e8e8c]" />
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-[#FFF5F5] transition-colors group">
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-[#E53E3E] group-hover:text-[#C53030]" />
              <span className="font-semibold text-[#E53E3E] group-hover:text-[#C53030]">Keluar</span>
            </div>
          </button>
        </div>
      </div>

      <SwitchRoleModal isOpen={showSwitchModal} onClose={() => setShowSwitchModal(false)} />
    </div>
  );
}

