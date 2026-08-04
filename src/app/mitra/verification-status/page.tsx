"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, XCircle, FileText, AlertCircle } from 'lucide-react';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';


export default function MitraVerificationStatusPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [status, setStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED' | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Kosong = platform belum menetapkan SLA; UI TIDAK boleh mengarang tenggat.
  const verificationSla = usePlatformConfig().profile?.verification_sla?.trim();

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchStatus();
  }, [isAuthenticated, user?.active_role]);

  const fetchStatus = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/partners/me');
    if (res.success && res.data) {
      // Backend mengirim enum lowercase: 'approved' | 'pending' | 'rejected'.
      // Petakan ke vocab UI (VERIFIED/PENDING/REJECTED) agar status tampil benar.
      // F2: default fail-closed ke 'pending' (bukan 'approved') — lihat plan §2.
      const raw = String(res.data.verification_status || 'pending').toUpperCase();
      const mapped = raw === 'APPROVED' ? 'VERIFIED' : raw === 'REJECTED' ? 'REJECTED' : raw === 'PENDING' ? 'PENDING' : (raw as 'PENDING' | 'VERIFIED' | 'REJECTED');
      setStatus(mapped);
      setReason(res.data.rejection_reason || null);
    }
    setLoading(false);
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      {/* Header */}
      <MitraPageHeader title="Status Verifikasi" variant="form" backHref="/mitra/profile" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="bg-white rounded-lg border border-brand-gray-100 p-6 h-64 animate-pulse flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 bg-brand-gray-100 rounded-full" />
            <div className="h-6 w-1/2 bg-brand-gray-100 rounded-md" />
            <div className="h-4 w-3/4 bg-brand-gray-100 rounded-md" />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-brand-gray-100 p-6 text-center shadow-sm">
            
            {status === 'VERIFIED' && (
              <>
                <div className="w-20 h-20 bg-brand-success-soft rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-brand-success-light">
                  <CheckCircle className="w-10 h-10 text-brand-success" />
                </div>
                <h2 className="text-xl font-bold text-brand-gray-900 mb-2">Akun Terverifikasi</h2>
                <p className="text-sm text-brand-gray-700 mb-6 leading-relaxed">
                  Selamat! Dokumen persyaratan Anda telah lolos verifikasi. Anda sekarang dapat menerima pesanan dan mencairkan dana.
                </p>
                <div className="bg-brand-gray-60 rounded-lg p-4 text-left border border-brand-gray-100">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-brand-success mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-brand-gray-900">KTP & Dokumen Pendukung</h3>
                      <p className="text-xs text-brand-gray-450 mt-0.5">Sudah dicek dan disetujui oleh tim Posko Jasa.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {status === 'PENDING' && (
              <>
                <div className="w-20 h-20 bg-brand-orange-soft rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-brand-orange-light">
                  <Clock className="w-10 h-10 text-brand-orange" />
                </div>
                <h2 className="text-xl font-bold text-brand-gray-900 mb-2">Menunggu Verifikasi</h2>
                <p className="text-sm text-brand-gray-700 mb-6 leading-relaxed">
                  Tim kami sedang melakukan pengecekan pada dokumen yang kamu unggah.
                  {verificationSla
                    ? ` Proses ini biasanya memakan waktu ${verificationSla}.`
                    : ' Kami akan memberi tahu begitu ada hasilnya.'}
                </p>
                <div className="bg-brand-orange-soft rounded-lg p-4 text-left border border-brand-orange/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-brand-orange mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-brand-orange">Harap Bersabar</h3>
                      <p className="text-xs text-brand-orange/80 mt-0.5">Selama proses ini, akun Anda dalam status peninjauan dan belum bisa menerima pesanan.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {status === 'REJECTED' && (
              <>
                <div className="w-20 h-20 bg-brand-error-soft rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-brand-error-light">
                  <XCircle className="w-10 h-10 text-brand-error" />
                </div>
                <h2 className="text-xl font-bold text-brand-gray-900 mb-2">Verifikasi Ditolak</h2>
                <p className="text-sm text-brand-gray-700 mb-6 leading-relaxed">
                  Maaf, dokumen yang Anda ajukan tidak memenuhi persyaratan kami. Silakan perbaiki dan unggah ulang dokumen Anda.
                </p>
                
                {reason && (
                  <div className="bg-brand-error-soft rounded-lg p-4 text-left border border-brand-error-border mb-6">
                    <p className="text-xs font-bold text-brand-error uppercase tracking-wider mb-1">Alasan Penolakan:</p>
                    <p className="text-sm text-brand-error font-medium">{reason}</p>
                  </div>
                )}

                <Button className="w-full bg-brand-red hover:bg-brand-red-dark rounded-md h-12 text-base font-bold" onClick={() => router.push('/mitra/register?mode=reverify')}>
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

