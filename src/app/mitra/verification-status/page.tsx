"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Clock, XCircle, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';
import { ROLE_PARTNER } from '@/lib/constants';


export default function MitraVerificationStatusPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [status, setStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED' | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    
    fetchStatus();
  }, [isAuthenticated, user?.active_role]);

  const fetchStatus = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/partners/me');
    if (res.success && res.data) {
      // Backend mengirim enum lowercase: 'approved' | 'pending' | 'rejected'.
      // Petakan ke vocab UI (VERIFIED/PENDING/REJECTED) agar status tampil benar.
      const raw = String(res.data.verification_status || 'approved').toUpperCase();
      const mapped = raw === 'APPROVED' ? 'VERIFIED' : raw === 'REJECTED' ? 'REJECTED' : raw === 'PENDING' ? 'PENDING' : (raw as 'PENDING' | 'VERIFIED' | 'REJECTED');
      setStatus(mapped);
      setReason(res.data.rejection_reason || null);
    }
    setLoading(false);
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Status Verifikasi</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-[#e5e2e1] p-6 h-64 animate-pulse flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 bg-[#e5e2e1] rounded-full" />
            <div className="h-6 w-1/2 bg-[#e5e2e1] rounded" />
            <div className="h-4 w-3/4 bg-[#e5e2e1] rounded" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e5e2e1] p-6 text-center shadow-sm">
            
            {status === 'VERIFIED' && (
              <>
                <div className="w-20 h-20 bg-[#F0FFF4] rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-[#C6F6D5]">
                  <CheckCircle className="w-10 h-10 text-[#38A169]" />
                </div>
                <h2 className="text-xl font-bold text-[#1c1b1b] mb-2">Akun Terverifikasi</h2>
                <p className="text-sm text-[#5b403e] mb-6 leading-relaxed">
                  Selamat! Dokumen persyaratan Anda telah lolos verifikasi. Anda sekarang dapat menerima pesanan dan mencairkan dana.
                </p>
                <div className="bg-[#f7f5f4] rounded-lg p-4 text-left border border-[#e5e2e1]">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-[#38A169] mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-[#1c1b1b]">KTP & Dokumen Pendukung</h3>
                      <p className="text-xs text-[#9e8e8c] mt-0.5">Sudah dicek dan disetujui oleh tim Posko Jasa.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {status === 'PENDING' && (
              <>
                <div className="w-20 h-20 bg-[#FFFAF0] rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-[#FEEBD8]">
                  <Clock className="w-10 h-10 text-[#DD6B20]" />
                </div>
                <h2 className="text-xl font-bold text-[#1c1b1b] mb-2">Menunggu Verifikasi</h2>
                <p className="text-sm text-[#5b403e] mb-6 leading-relaxed">
                  Tim kami sedang melakukan pengecekan pada dokumen yang Anda unggah. Proses ini biasanya memakan waktu 1-2 hari kerja.
                </p>
                <div className="bg-[#fff8f2] rounded-lg p-4 text-left border border-[#DD6B20]/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#DD6B20] mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-[#DD6B20]">Harap Bersabar</h3>
                      <p className="text-xs text-[#DD6B20]/80 mt-0.5">Selama proses ini, akun Anda dalam status peninjauan dan belum bisa menerima pesanan.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {status === 'REJECTED' && (
              <>
                <div className="w-20 h-20 bg-[#FFF5F5] rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-[#FED7D7]">
                  <XCircle className="w-10 h-10 text-[#E53E3E]" />
                </div>
                <h2 className="text-xl font-bold text-[#1c1b1b] mb-2">Verifikasi Ditolak</h2>
                <p className="text-sm text-[#5b403e] mb-6 leading-relaxed">
                  Maaf, dokumen yang Anda ajukan tidak memenuhi persyaratan kami. Silakan perbaiki dan unggah ulang dokumen Anda.
                </p>
                
                {reason && (
                  <div className="bg-[#FFF5F5] rounded-lg p-4 text-left border border-[#FEB2B2] mb-6">
                    <p className="text-xs font-bold text-[#E53E3E] uppercase tracking-wider mb-1">Alasan Penolakan:</p>
                    <p className="text-sm text-[#E53E3E] font-medium">{reason}</p>
                  </div>
                )}

                <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded h-12 text-base font-bold" onClick={() => router.push('/mitra/register?mode=reverify')}>
                  Ajukan Verifikasi Ulang
                </Button>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

