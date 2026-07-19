"use client";

import { getInitial } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  User, ShieldCheck, CreditCard, ChevronRight,
  LogOut, FileText, CheckCircle, RefreshCw, Image as ImageIcon, MapPin, Camera, Bell
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';
import { SwitchRoleModal } from '@/components/ui/switch-role-modal';
import { useUpload } from '@/hooks/useUpload';
import { useAuthStore } from '@/lib/store/authStore';

export default function MitraProfilePage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const { logout } = useAuth();
  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchProfile();
  }, [isAuthenticated, user?.active_role]);

  const fetchProfile = async () => {
    const res = await fetchAPI<any>('/partners/me');
    if (res.success && res.data) {
      setVerificationStatus(res.data.verification_status || 'VERIFIED');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto maksimal 5MB');
      return;
    }

    const fileUrl = await uploadFile(file);
    if (fileUrl) {
      const res = await fetchAPI('/partners/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: fileUrl }),
      });
      
      if (res.success) {
        useAuthStore.getState().updateUser({ avatar_url: fileUrl });
      } else {
        alert(res.message || 'Gagal memperbarui foto profil');
      }
    } else {
      alert('Gagal mengupload foto');
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  const vs = (verificationStatus || '').toUpperCase();
  const isVerified = vs === 'APPROVED' || vs === 'VERIFIED';
  const isPending = vs === 'PENDING';

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header Profile Info */}
      <div className="bg-white border-b border-[#e5e2e1] pt-12 pb-6 px-4 mb-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full bg-[#f7f5f4] flex items-center justify-center text-3xl font-bold text-[#b51822] overflow-hidden shrink-0 border-2 border-[#e5e2e1]">
            {user?.avatar_url ? <img src={user?.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : getInitial(user?.name || '')}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 w-full h-1/3 bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              {isUploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/jpeg,image/png,image/jpg" 
              className="hidden" 
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1c1b1b]">{user?.name}</h1>
            <p className="text-sm text-[#5b403e]">{user?.phone}</p>
            {verificationStatus !== null && (
              <div className="flex items-center gap-1 mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                  isVerified ? 'bg-[#F0FFF4] text-[#38A169]' :
                  isPending ? 'bg-[#FFFAF0] text-[#DD6B20]' :
                  'bg-[#FFF5F5] text-[#E53E3E]'
                }`}>
                  {isVerified && <CheckCircle className="w-3 h-3" />}
                  {isVerified ? 'Terverifikasi' : isPending ? 'Menunggu Verifikasi' : 'Ditolak'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Menu Group 1: Akun & Keamanan */}
        <div className="bg-white rounded-md border border-[#e5e2e1] overflow-hidden">
          <Link href="/notifications" className="flex items-center justify-between p-4 border-b border-[#e5e2e1] hover:bg-[#f7f5f4] transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#9e8e8c]" />
              <span className="font-semibold text-[#1c1b1b]">Notifikasi</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9e8e8c]" />
          </Link>
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

