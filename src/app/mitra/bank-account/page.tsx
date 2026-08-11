"use client";

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useIsPartnerVerified } from '@/hooks/usePartnerVerificationStatus';
import { VerifiedLockNotice } from '@/components/mitra/VerifiedLockBadge';
import { PageSkeleton } from '@/components/ui/skeleton';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import BankAccountForm from '@/components/wallet/BankAccountForm';

/**
 * Rekening payout mitra . kerangka + gerbang "terkunci" saja.
 *
 * Formulirnya dipakai bersama halaman pelanggan `/profile/bank-account`:
 * handler `/partners/me/bank-account` menulis ke kolom `users.bank_*`, bukan
 * tabel `partners`, dan penarikan membaca kolom yang sama.
 *
 * Yang khusus mitra: F1 guard . mitra yang SUDAH diverifikasi admin tidak boleh
 * mengganti rekening payout walau OTP-nya benar (risiko fraud; wajib lewat
 * admin revoke). Pelanggan tidak punya padanan gerbang ini karena tidak ada
 * yang memverifikasi rekening pelanggan.
 */
export default function MitraBankAccountPage() {
  const { isLoading: authLoading, isAuthorized, isAuthenticated } = useRequireAuth();
  const isVerified = useIsPartnerVerified(isAuthorized);

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="pb-6">
      <MitraPageHeader
        title="Rekening Bank Utama"
        variant="form"
        backHref="/mitra/profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Rekening Bank' }]}
      />

      <MitraPageContainer variant="form">
        <BankAccountForm
          enabled={isAuthenticated}
          locked={isVerified}
          lockNotice={
            <VerifiedLockNotice
              title="Rekening terkunci"
              message="Rekening payout sudah diverifikasi admin. Hubungi admin untuk mengubah (cabut verifikasi) - OTP saja tidak cukup."
            />
          }
        />
      </MitraPageContainer>
    </div>
  );
}
