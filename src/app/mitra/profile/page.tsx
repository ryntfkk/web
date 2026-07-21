"use client";

import { getInitial } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';
import {
  User, ShieldCheck, CreditCard, LogOut, FileText, CheckCircle,
  RefreshCw, Image as ImageIcon, MapPin, Camera, Bell, Phone, Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SwitchRoleModal } from '@/components/ui/switch-role-modal';
import { useUpload } from '@/hooks/useUpload';
import { useAuthStore } from '@/lib/store/authStore';
import { MenuCard, MenuListItem } from '@/components/ui/menu-list-item';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleLogout = () => logout();

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  const vs = (verificationStatus || '').toUpperCase();
  const isVerified = vs === 'APPROVED' || vs === 'VERIFIED';
  const isPending = vs === 'PENDING';

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header — hero premium */}
      <div className="bg-gradient-to-br from-[#b51822] via-[#d63b45] to-[#b51822] text-white px-4 py-6 md:py-10 relative overflow-hidden shadow-md">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>

        <div className="max-w-lg mx-auto relative z-10 flex items-center gap-4 md:gap-6">
          <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl md:text-4xl font-extrabold text-white overflow-hidden shrink-0 border border-white/30 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            {user?.avatar_url ? <img src={user?.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : getInitial(user?.name || '')}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 w-full h-1/3 bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
              aria-label="Ubah foto profil"
            >
              {isUploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png,image/jpg" className="hidden" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-extrabold truncate tracking-tight drop-shadow-sm">{user?.name}</h1>
            <p className="text-white/90 text-[13px] md:text-sm font-medium mt-0.5 md:mt-1 drop-shadow-sm">{user?.phone}</p>
            <div className="mt-2 md:mt-3 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold text-white bg-white/20 backdrop-blur-sm border border-white/20 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Mode Mitra
              </span>
              {verificationStatus !== null && (
                <span className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase inline-flex items-center gap-1.5 shadow-sm border ${
                  isVerified ? 'bg-[#F0FFF4]/90 backdrop-blur-sm text-[#276749] border-[#C6F6D5]' :
                  isPending ? 'bg-[#FFFAF0]/90 backdrop-blur-sm text-[#975A16] border-[#FEEBC8]' :
                  'bg-white/90 backdrop-blur-sm text-[#9B2C2C] border-[#FED7D7]'
                }`}>
                  {isVerified && <CheckCircle className="w-3.5 h-3.5" />}
                  {isVerified ? 'Terverifikasi' : isPending ? 'Menunggu Verifikasi' : 'Ditolak'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <MenuCard title="Mode">
          <MenuListItem icon={RefreshCw} label="Beralih ke Mode Pelanggan" subtitle="Pesan jasa sebagai pelanggan" onClick={() => setShowSwitchModal(true)} />
        </MenuCard>

        <MenuCard title="Akun & Mitra">
          <MenuListItem icon={ShieldCheck} label="Status Verifikasi Dokumen" subtitle="Cek status & unggah ulang dokumen" href="/mitra/verification-status" />
          <MenuListItem icon={User} label="Keamanan Akun" subtitle="Ubah kata sandi & keamanan" href="/profile/security" />
          <MenuListItem icon={MapPin} label="Alamat Basecamp" subtitle="Titik lokasi & jangkauan layanan" href="/mitra/basecamp" />
          <MenuListItem icon={CreditCard} label="Rekening Bank" subtitle="Tujuan pencairan saldo" href="/mitra/bank-account" />
          <MenuListItem icon={ImageIcon} label="Galeri Portofolio" subtitle="Foto hasil pekerjaan" href="/mitra/portfolio" />
          <MenuListItem icon={Bell} label="Notifikasi" subtitle="Push notification & email" href="/notifications" />
        </MenuCard>

        <MenuCard title="Bantuan & Legal">
          <MenuListItem icon={Phone} label="Hubungi Kami" subtitle="Chat CS untuk bantuan & sengketa" href="/help" />
          <MenuListItem icon={FileText} label="Syarat & Ketentuan Mitra" href="/terms" />
          <MenuListItem icon={ShieldCheck} label="Kebijakan Privasi" href="/privacy" />
        </MenuCard>


        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-white py-4 rounded border border-[#b51822] text-[#b51822] font-semibold hover:bg-[#fdf2f2] transition-colors"
        >
          <LogOut className="w-5 h-5" /> Keluar dari Akun
        </button>

        <p className="text-center text-xs text-[#8f6f6d]">Versi 1.0.0</p>
      </div>

      <SwitchRoleModal isOpen={showSwitchModal} onClose={() => setShowSwitchModal(false)} />
    </div>
  );
}
