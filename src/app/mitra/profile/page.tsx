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
      {/* Header — hero merah, konsisten dengan /profile pelanggan */}
      <div className="bg-[#b51822] text-white px-4 py-6">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white overflow-hidden shrink-0 border-2 border-white/50">
            {user?.avatar_url ? <img src={user?.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : getInitial(user?.name || '')}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 w-full h-1/3 bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
              aria-label="Ubah foto profil"
            >
              {isUploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png,image/jpg" className="hidden" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{user?.name}</h1>
            <p className="text-white/80 text-sm">{user?.phone}</p>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs text-white bg-white/20 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" /> Mode Mitra
              </span>
              {verificationStatus !== null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase inline-flex items-center gap-1 ${
                  isVerified ? 'bg-[#F0FFF4] text-[#38A169]' :
                  isPending ? 'bg-[#FFFAF0] text-[#DD6B20]' :
                  'bg-white text-[#E53E3E]'
                }`}>
                  {isVerified && <CheckCircle className="w-3 h-3" />}
                  {isVerified ? 'Terverifikasi' : isPending ? 'Menunggu Verifikasi' : 'Ditolak'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
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

        <MenuCard title="Mode">
          <MenuListItem icon={RefreshCw} label="Beralih ke Mode Pelanggan" subtitle="Pesan jasa sebagai pelanggan" onClick={() => setShowSwitchModal(true)} />
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
