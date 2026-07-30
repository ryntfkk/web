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
  /** useAuth().loading â€” menonaktifkan tombol switch selama proses. */
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
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-brand-gray-80 overflow-hidden mb-6 relative group transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          {/* Subtle gradient accent on top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red via-brand-red-accent to-brand-red"></div>
          
          <div className="p-4 md:p-5 flex items-center justify-between border-b border-brand-gray-80/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-brand-red-soft to-brand-red-soft flex items-center justify-center text-brand-red shadow-inner">
                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div>
                <p className="font-bold text-brand-gray-900 text-sm leading-none mb-1">Mitra Posko Jasa</p>
                <div className="flex items-center gap-1 text-[11px] font-medium text-brand-success bg-brand-success-soft px-2 py-0.5 rounded-full w-max">
                  <CheckCircle2 className="w-3 h-3" />
                  Terverifikasi
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] text-brand-gray-400 font-medium uppercase tracking-wider mb-0.5">Role Aktif</p>
              <p className="text-xs font-bold text-brand-red bg-brand-red-soft px-2 py-1 rounded-md">
                {user.active_role === 'partner' ? 'Mitra' : 'Pelanggan'}
              </p>
            </div>
          </div>
          
          <div className="p-4 md:p-5 grid grid-cols-3 gap-2 md:gap-3">
            <div className="bg-brand-gray-55 hover:bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 flex flex-col items-center justify-center border border-transparent hover:border-brand-gray-80 hover:shadow-sm transition-all duration-300 cursor-default">
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-brand-orange-soft flex items-center justify-center mb-1.5 md:mb-2">
                <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-brand-warning fill-brand-warning" />
              </div>
              <p className="text-base md:text-lg font-extrabold text-brand-gray-900 leading-tight">
                {partnerStatus && 'rating' in partnerStatus ? (partnerStatus as any).rating?.toFixed(1) ?? 'â€”' : 'â€”'}
              </p>
              <p className="text-[9px] md:text-[10px] text-brand-gray-700 font-medium mt-0.5">Rating</p>
            </div>
            
            <div className="bg-brand-gray-55 hover:bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 flex flex-col items-center justify-center border border-transparent hover:border-brand-gray-80 hover:shadow-sm transition-all duration-300 cursor-default">
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-brand-info-soft flex items-center justify-center mb-1.5 md:mb-2">
                <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-brand-info" />
              </div>
              <p className="text-base md:text-lg font-extrabold text-brand-gray-900 leading-tight">
                {partnerStatus && 'total_orders' in partnerStatus ? (partnerStatus as any).total_orders ?? 0 : 0}
              </p>
              <p className="text-[9px] md:text-[10px] text-brand-gray-700 font-medium mt-0.5">Order</p>
            </div>
            
            <div className="bg-brand-gray-55 hover:bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 flex flex-col items-center justify-center border border-transparent hover:border-brand-gray-80 hover:shadow-sm transition-all duration-300 cursor-default">
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-brand-success-soft flex items-center justify-center mb-1.5 md:mb-2">
                <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5 text-brand-success" />
              </div>
              <p className="text-base md:text-lg font-extrabold text-brand-gray-900 leading-tight">
                {partnerStatus && 'acceptance_rate' in partnerStatus ? `${(partnerStatus as any).acceptance_rate ?? 0}%` : 'â€”'}
              </p>
              <p className="text-[9px] md:text-[10px] text-brand-gray-700 font-medium mt-0.5">Acc Rate</p>
            </div>
          </div>
          
          <div className="px-4 pb-4 md:px-5 md:pb-5">
            <button
              onClick={onSwitchRole}
              disabled={switching}
              className={`w-full relative overflow-hidden group rounded-xl font-bold text-sm py-3 px-4 transition-all duration-300 flex items-center justify-center gap-2 ${
                user.active_role === 'partner' 
                  ? 'bg-white text-brand-gray-900 border border-brand-gray-100 hover:bg-brand-gray-55 hover:border-brand-gray-200' 
                  : 'bg-brand-red text-white hover:bg-brand-red-dark shadow-[0_4px_12px_rgba(181,24,34,0.25)] hover:shadow-[0_6px_16px_rgba(181,24,34,0.35)] border border-transparent'
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
        <div className="bg-gradient-to-br from-white to-brand-red-soft rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-brand-gray-80 overflow-hidden mb-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-bl-full -z-0"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-red/5 rounded-tr-full -z-0"></div>
          
          <div className="p-4 md:p-5 flex flex-col items-center justify-center text-center relative z-10">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-brand-red-soft rounded-full flex items-center justify-center mb-3 md:mb-4">
              <Briefcase className="w-6 h-6 md:w-8 md:h-8 text-brand-red" />
            </div>
            
            <h3 className="text-sm md:text-base font-bold text-brand-gray-900 mb-1 md:mb-2 tracking-tight">
              {partnerStatus?.verification_status === 'pending' ? 'Verifikasi Sedang Diproses' : 'Mulai Perjalanan Anda'}
            </h3>
            
            <p className="text-xs text-brand-gray-400 mb-4 md:mb-6 max-w-[200px] md:max-w-[250px] leading-relaxed">
              {partnerStatus?.verification_status === 'pending'
                ? 'Tim kami sedang meninjau dokumen pendaftaran Anda. Mohon tunggu maksimal 1x24 jam kerja.'
                : 'Daftar sebagai mitra dan raih penghasilan tambahan bersama Posko Jasa.'}
            </p>
            
            {!partnerStatus ? (
              <button 
                onClick={() => router.push('/mitra/register')}
                className="w-full bg-brand-red text-white font-bold py-3 px-4 rounded-xl shadow-[0_4px_12px_rgba(181,24,34,0.2)] hover:bg-brand-red-dark hover:shadow-[0_6px_16px_rgba(181,24,34,0.3)] transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                Daftar Jadi Mitra Sekarang
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : partnerStatus.verification_status === 'pending' ? (
              <div className="bg-brand-warning-soft rounded-xl p-4 border border-brand-warning-light flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-1 text-brand-warning-dark">
                  <div className="w-2 h-2 rounded-full bg-brand-warning animate-pulse"></div>
                  <p className="text-sm font-bold">Sedang Ditinjau</p>
                </div>
                <p className="text-xs text-brand-warning-dark">Mohon cek secara berkala</p>
              </div>
            ) : partnerStatus.verification_status === 'rejected' ? (
              <div className="space-y-3">
                {partnerStatus.rejection_reason && (
                  <div className="bg-brand-error-soft rounded-xl p-4 border border-brand-error-border text-left">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-brand-error mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-brand-error-dark mb-0.5">Pendaftaran Perlu Diperbaiki</p>
                        <p className="text-xs text-brand-error-dark leading-relaxed">{partnerStatus.rejection_reason}</p>
                      </div>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => router.push('/mitra/register')}
                  className="w-full bg-white text-brand-error border-2 border-brand-error font-bold py-3 px-4 rounded-xl hover:bg-brand-error-soft transition-colors flex items-center justify-center gap-2"
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

