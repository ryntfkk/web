"use client";

import { useRouter } from 'next/navigation';
import { Briefcase, Star, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/store/authStore';

export interface PartnerProfile {
  id: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  is_online: boolean;
}

interface PartnerStatusCardProps {
  user: User;
  partnerStatus: PartnerProfile | null;
  statusLoading: boolean;
  /** useAuth().loading — menonaktifkan tombol switch selama proses. */
  switching: boolean;
  /** Membuka SwitchRoleModal (instance modal tetap di page). */
  onSwitchRole: () => void;
}

export default function PartnerStatusCard({ user, partnerStatus, statusLoading, switching, onSwitchRole }: PartnerStatusCardProps) {
  const router = useRouter();

  return (
    <>
      {/* Partner Stats Card (if partner) */}
      {partnerStatus?.verification_status === 'approved' && (
        <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden mb-4">
          <div className="p-4 border-b border-[#e5e2e1] bg-[#fdf2f2]">
            <div className="flex items-center">
              <div className="p-2 bg-[#b51822]/10 rounded mr-3">
                <Briefcase className="w-5 h-5 text-[#b51822]" />
              </div>
              <div>
                <p className="font-semibold text-[#32201f] text-sm">Status Partner</p>
                <p className="text-xs text-[#8f6f6d]">Terverifikasi</p>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <Star className="w-4 h-4 text-[#D69E2E] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#32201f]">{partnerStatus && 'rating' in partnerStatus ? (partnerStatus as any).rating?.toFixed(1) ?? '—' : '—'}</p>
              <p className="text-xs text-[#8f6f6d]">Rating</p>
            </div>
            <div>
              <Clock className="w-4 h-4 text-[#3182CE] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#32201f]">{partnerStatus && 'total_orders' in partnerStatus ? (partnerStatus as any).total_orders ?? 0 : 0}</p>
              <p className="text-xs text-[#8f6f6d]">Order</p>
            </div>
            <div>
              <TrendingUp className="w-4 h-4 text-[#38A169] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#32201f]">{partnerStatus && 'acceptance_rate' in partnerStatus ? `${(partnerStatus as any).acceptance_rate ?? 0}%` : '—'}</p>
              <p className="text-xs text-[#8f6f6d]">Acc Rate</p>
            </div>
          </div>
          <div className="p-4 border-t border-[#e5e2e1]">
            <Button
              size="sm"
              variant={user.active_role === 'partner' ? 'secondary' : 'primary'}
              className="w-full"
              onClick={onSwitchRole}
              disabled={switching}
            >
              {user.active_role === 'partner' ? 'Ke Pelanggan' : 'Ke Mitra'}
            </Button>
          </div>
        </div>
      )}

      {/* Partner Registration / Verification Card (belum approved) */}
      {!statusLoading && partnerStatus?.verification_status !== 'approved' && (
        <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden mb-4">
          <div className="p-4 text-center">
            <Briefcase className="w-12 h-12 text-[#8f6f6d]/50 mx-auto mb-3" />
            <p className="font-semibold text-[#32201f] mb-1">
              {partnerStatus?.verification_status === 'pending' ? 'Pendaftaran Mitra' : 'Jadilah Mitra Kami'}
            </p>
            <p className="text-xs text-[#8f6f6d] mb-4">
              {partnerStatus?.verification_status === 'pending'
                ? 'Dokumen Anda sedang kami tinjau.'
                : 'Daftar sebagai mitra dan mulai hasilkan uang tambahan.'}
            </p>
            {!partnerStatus ? (
              <Button className="w-full" onClick={() => router.push('/mitra/register')}>
                Daftar Jadi Mitra
              </Button>
            ) : partnerStatus.verification_status === 'pending' ? (
              <div className="bg-yellow-50 rounded p-3 border border-yellow-200">
                <p className="text-xs text-yellow-800 font-medium">Verifikasi Diproses</p>
                <p className="text-xs text-yellow-700 mt-1">Maks. 24 jam</p>
              </div>
            ) : partnerStatus.verification_status === 'rejected' ? (
              <div className="space-y-2">
                {partnerStatus.rejection_reason && (
                  <div className="bg-red-50 rounded p-3 border border-red-200 text-left">
                    <p className="text-xs font-medium text-[#b51822]">Pendaftaran ditolak:</p>
                    <p className="text-xs text-[#5b403e] mt-1">{partnerStatus.rejection_reason}</p>
                  </div>
                )}
                <Button size="sm" variant="danger" className="w-full border-[#b51822]" onClick={() => router.push('/mitra/register')}>
                  Perbaiki & Kirim Ulang
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
