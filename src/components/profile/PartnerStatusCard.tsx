"use client";

import { useRouter } from 'next/navigation';
import { Briefcase, Star, Clock, TrendingUp, CheckCircle2, ChevronRight, ShieldCheck, AlertCircle } from 'lucide-react';
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
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[#f0eceb] overflow-hidden mb-6 relative group transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          {/* Subtle gradient accent on top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#b51822] via-[#d63b45] to-[#b51822]"></div>
          
          <div className="p-5 flex items-center justify-between border-b border-[#f0eceb]/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fff0f0] to-[#fdeaea] flex items-center justify-center text-[#b51822] shadow-inner">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-[#1c1b1b] text-sm leading-none mb-1">Mitra Posko Jasa</p>
                <div className="flex items-center gap-1 text-[11px] font-medium text-[#38A169] bg-[#F0FFF4] px-2 py-0.5 rounded-full w-max">
                  <CheckCircle2 className="w-3 h-3" />
                  Terverifikasi
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] text-[#8f6f6d] font-medium uppercase tracking-wider mb-0.5">Role Aktif</p>
              <p className="text-xs font-bold text-[#b51822] bg-[#fff0f0] px-2 py-1 rounded-md">
                {user.active_role === 'partner' ? 'Mitra' : 'Pelanggan'}
              </p>
            </div>
          </div>
          
          <div className="p-5 grid grid-cols-3 gap-3">
            <div className="bg-[#fcfafa] hover:bg-white rounded-xl p-3 flex flex-col items-center justify-center border border-transparent hover:border-[#f0eceb] hover:shadow-sm transition-all duration-300 cursor-default">
              <div className="w-7 h-7 rounded-full bg-[#FFFAF0] flex items-center justify-center mb-2">
                <Star className="w-3.5 h-3.5 text-[#D69E2E] fill-[#D69E2E]" />
              </div>
              <p className="text-lg font-extrabold text-[#1c1b1b] leading-tight">
                {partnerStatus && 'rating' in partnerStatus ? (partnerStatus as any).rating?.toFixed(1) ?? '—' : '—'}
              </p>
              <p className="text-[10px] text-[#5b403e] font-medium mt-0.5">Rating</p>
            </div>
            
            <div className="bg-[#fcfafa] hover:bg-white rounded-xl p-3 flex flex-col items-center justify-center border border-transparent hover:border-[#f0eceb] hover:shadow-sm transition-all duration-300 cursor-default">
              <div className="w-7 h-7 rounded-full bg-[#EBF8FF] flex items-center justify-center mb-2">
                <Clock className="w-3.5 h-3.5 text-[#3182CE]" />
              </div>
              <p className="text-lg font-extrabold text-[#1c1b1b] leading-tight">
                {partnerStatus && 'total_orders' in partnerStatus ? (partnerStatus as any).total_orders ?? 0 : 0}
              </p>
              <p className="text-[10px] text-[#5b403e] font-medium mt-0.5">Order</p>
            </div>
            
            <div className="bg-[#fcfafa] hover:bg-white rounded-xl p-3 flex flex-col items-center justify-center border border-transparent hover:border-[#f0eceb] hover:shadow-sm transition-all duration-300 cursor-default">
              <div className="w-7 h-7 rounded-full bg-[#F0FFF4] flex items-center justify-center mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-[#38A169]" />
              </div>
              <p className="text-lg font-extrabold text-[#1c1b1b] leading-tight">
                {partnerStatus && 'acceptance_rate' in partnerStatus ? `${(partnerStatus as any).acceptance_rate ?? 0}%` : '—'}
              </p>
              <p className="text-[10px] text-[#5b403e] font-medium mt-0.5">Acc Rate</p>
            </div>
          </div>
          
          <div className="px-5 pb-5">
            <button
              onClick={onSwitchRole}
              disabled={switching}
              className={`w-full relative overflow-hidden group rounded-xl font-bold text-sm py-3 px-4 transition-all duration-300 flex items-center justify-center gap-2 ${
                user.active_role === 'partner' 
                  ? 'bg-white text-[#1c1b1b] border border-[#e5e2e1] hover:bg-[#fcfafa] hover:border-[#d4d1d0]' 
                  : 'bg-[#b51822] text-white hover:bg-[#9a141d] shadow-[0_4px_12px_rgba(181,24,34,0.25)] hover:shadow-[0_6px_16px_rgba(181,24,34,0.35)] border border-transparent'
              } disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {switching ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {user.active_role === 'partner' ? 'Kembali ke Mode Pelanggan' : 'Masuk ke Mode Mitra'}
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${user.active_role === 'partner' ? 'group-hover:translate-x-1' : 'group-hover:translate-x-1'}`} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Partner Registration / Verification Card (belum approved) */}
      {!statusLoading && partnerStatus?.verification_status !== 'approved' && (
        <div className="bg-gradient-to-br from-white to-[#fff9f9] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[#f0eceb] overflow-hidden mb-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#b51822]/5 rounded-bl-full -z-0"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#b51822]/5 rounded-tr-full -z-0"></div>
          
          <div className="p-6 text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-[#f0eceb] flex items-center justify-center mx-auto mb-4 rotate-3">
              <Briefcase className="w-8 h-8 text-[#b51822]" />
            </div>
            
            <h3 className="text-lg font-extrabold text-[#1c1b1b] mb-2 tracking-tight">
              {partnerStatus?.verification_status === 'pending' ? 'Verifikasi Sedang Diproses' : 'Hasilkan Uang Tambahan'}
            </h3>
            
            <p className="text-sm text-[#5b403e] mb-6 leading-relaxed px-2">
              {partnerStatus?.verification_status === 'pending'
                ? 'Tim kami sedang meninjau dokumen pendaftaran Anda. Mohon tunggu maksimal 1x24 jam kerja.'
                : 'Bergabunglah sebagai mitra Posko Jasa, atur jadwal Anda sendiri, dan jangkau lebih banyak pelanggan.'}
            </p>
            
            {!partnerStatus ? (
              <button 
                onClick={() => router.push('/mitra/register')}
                className="w-full bg-[#b51822] text-white font-bold py-3 px-4 rounded-xl shadow-[0_4px_12px_rgba(181,24,34,0.2)] hover:bg-[#9a141d] hover:shadow-[0_6px_16px_rgba(181,24,34,0.3)] transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                Daftar Jadi Mitra Sekarang
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : partnerStatus.verification_status === 'pending' ? (
              <div className="bg-[#FFFBEB] rounded-xl p-4 border border-[#FDE68A] flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-1 text-[#92400E]">
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></div>
                  <p className="text-sm font-bold">Sedang Ditinjau</p>
                </div>
                <p className="text-xs text-[#B45309]">Mohon cek secara berkala</p>
              </div>
            ) : partnerStatus.verification_status === 'rejected' ? (
              <div className="space-y-3">
                {partnerStatus.rejection_reason && (
                  <div className="bg-[#FEF2F2] rounded-xl p-4 border border-[#FECACA] text-left">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#EF4444] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-[#991B1B] mb-0.5">Pendaftaran Perlu Diperbaiki</p>
                        <p className="text-xs text-[#B91C1C] leading-relaxed">{partnerStatus.rejection_reason}</p>
                      </div>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => router.push('/mitra/register')}
                  className="w-full bg-white text-[#EF4444] border-2 border-[#EF4444] font-bold py-3 px-4 rounded-xl hover:bg-[#FEF2F2] transition-colors flex items-center justify-center gap-2"
                >
                  Perbaiki & Kirim Ulang
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

