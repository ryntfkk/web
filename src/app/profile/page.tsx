"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';
import { User, LogOut, FileText, Settings, ShieldCheck, MapPin, ChevronRight, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';

interface PartnerProfile {
  id: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  is_online: boolean;
}

export default function ProfilePage() {
  const { user, isAuthenticated, logout, switchRole, loading } = useAuth();
  const router = useRouter();
  const [partnerStatus, setPartnerStatus] = useState<PartnerProfile | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      checkPartnerStatus();
    }
  }, [isAuthenticated, router]);

  const checkPartnerStatus = async () => {
    setStatusLoading(true);
    const res = await fetchAPI<PartnerProfile>('/partners/me', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.success && res.data) {
      setPartnerStatus(res.data);
    }
    setStatusLoading(false);
  };

  const handleSwitchRole = async (role: 'customer' | 'partner') => {
    await switchRole(role);
    window.location.reload();
  };

  if (!user || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Header - boxy style */}
      <div className="bg-[#b51822] text-white px-4 py-6 pt-12 pb-8">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div className="h-16 w-16 bg-white/20 rounded flex items-center justify-center text-2xl font-bold text-white border-2 border-white/50">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-white/80 text-sm">{user.phone}</p>
            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs text-white bg-white/20">
              <ShieldCheck className="w-3 h-3 mr-1" />
              {user.active_role === 'partner' ? 'Mode Mitra' : 'Mode Pelanggan'}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4 max-w-md mx-auto">

        {/* Role & Partner Status Section */}
        <section>
          <h2 className="text-xs font-semibold text-[#8f6f6d] mb-3 uppercase tracking-wider">Status & Peran</h2>

          <div className="bg-white rounded-lg border border-[#e5e2e1] overflow-hidden">
            {user.roles.includes('partner') && partnerStatus?.verification_status === 'approved' ? (
              <div className="p-4 border-b border-[#e5e2e1] flex justify-between items-center bg-[#fdf2f2]">
                <div className="flex items-center">
                  <div className="p-2 bg-[#b51822]/10 rounded mr-3">
                    <Briefcase className="w-5 h-5 text-[#b51822]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#32201f] text-sm">Peralihan Mode</p>
                    <p className="text-xs text-[#8f6f6d]">Beralih antara pelanggan & mitra</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={user.active_role === 'partner' ? 'secondary' : 'primary'}
                  onClick={() => handleSwitchRole(user.active_role === 'partner' ? 'customer' : 'partner')}
                  disabled={loading}
                >
                  {user.active_role === 'partner' ? 'Ke Pelanggan' : 'Ke Mitra'}
                </Button>
              </div>
            ) : null}

            {!user.roles.includes('partner') && (
              <div className="p-4">
                {!statusLoading ? (
                  <>
                    {!partnerStatus ? (
                      <div className="text-center py-2">
                        <Briefcase className="w-10 h-10 text-[#8f6f6d]/50 mx-auto mb-2" />
                        <p className="font-semibold text-[#32201f] mb-1">Punya Keahlian?</p>
                        <p className="text-xs text-[#8f6f6d] mb-3">Jadilah mitra Posko Jasa dan hasilkan uang tambahan.</p>
                        <Button className="w-full" onClick={() => router.push('/mitra/register')}>
                          Daftar Jadi Mitra
                        </Button>
                      </div>
                    ) : partnerStatus.verification_status === 'pending' ? (
                      <div className="text-center py-2 bg-yellow-50 rounded border border-yellow-200 px-3">
                        <p className="font-semibold text-yellow-800 mb-1">Verifikasi Diproses</p>
                        <p className="text-xs text-yellow-700">Pendaftaran mitra Anda sedang ditinjau oleh tim kami (Maks. 24 jam).</p>
                      </div>
                    ) : partnerStatus.verification_status === 'rejected' ? (
                      <div className="text-center py-2 bg-red-50 rounded border border-red-200 px-3">
                        <p className="font-semibold text-[#b51822] mb-1">Pendaftaran Ditolak</p>
                        <p className="text-xs text-red-700 mb-3">{partnerStatus.rejection_reason || 'Dokumen tidak valid.'}</p>
                        <Button size="sm" variant="danger" className="w-full border-[#b51822]" onClick={() => router.push('/mitra/register')}>
                          Perbaiki & Kirim Ulang
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="animate-pulse h-16 bg-gray-100 rounded"></div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Account Settings Menu - boxy style */}
        <section>
          <h2 className="text-xs font-semibold text-[#8f6f6d] mb-3 uppercase tracking-wider">Pengaturan Akun</h2>
          <div className="bg-white rounded-lg border border-[#e5e2e1] overflow-hidden divide-y divide-[#e5e2e1]">
            <button className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
              <User className="w-5 h-5 text-[#8f6f6d] mr-3" />
              <div className="flex-1">
                <span className="text-[#32201f] font-medium block text-sm">Informasi Pribadi</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
            </button>
            <button className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
              <MapPin className="w-5 h-5 text-[#8f6f6d] mr-3" />
              <div className="flex-1">
                <span className="text-[#32201f] font-medium block text-sm">Buku Alamat</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
            </button>
            <button className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
              <Settings className="w-5 h-5 text-[#8f6f6d] mr-3" />
              <div className="flex-1">
                <span className="text-[#32201f] font-medium block text-sm">Pengaturan Keamanan</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
            </button>
          </div>
        </section>

        {/* Support - boxy style */}
        <section>
          <div className="bg-white rounded-lg border border-[#e5e2e1] overflow-hidden">
            <button className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
              <FileText className="w-5 h-5 text-[#8f6f6d] mr-3" />
              <div className="flex-1">
                <span className="text-[#32201f] font-medium block text-sm">Pusat Bantuan & Syarat Ketentuan</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
            </button>
          </div>
        </section>

        {/* Logout Button */}
        <Button
          variant="secondary"
          className="w-full py-6 text-[#b51822] border-[#b51822] hover:bg-[#fdf2f2] mt-4 rounded"
          onClick={logout}
          disabled={loading}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Keluar dari Akun
        </Button>
        <p className="text-center text-xs text-[#8f6f6d] mt-4">Versi 1.0.0</p>
      </div>

      <BottomNav />
    </div>
  );
}
