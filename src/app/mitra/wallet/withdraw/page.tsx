"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import { PageSkeleton } from '@/components/ui/skeleton';
import WithdrawForm, { type SavedBankAccount } from '@/components/wallet/WithdrawForm';
import { usePartnerVerificationStatus } from '@/hooks/usePartnerVerificationStatus';

/**
 * Penarikan dana mitra . kerangka + sumber rekening + GERBANG KYC.
 *
 * Model mitra instan (PLAN-MITRA-INSTAN): mitra belum-KYC bisa punya saldo
 * (earning masuk sejak hari pertama), tetapi backend menolak penarikannya
 * dengan `KYC_REQUIRED`. Gerbangnya dipasang DI HALAMAN INI, BUKAN di dalam
 * `WithdrawForm` . form itu dipakai juga pelanggan (/profile/wallet/withdraw)
 * yang menarik refund TANPA KYC (keputusan produk 2026-08-10, A04-T1).
 * Memasang gerbang di form = memblokir refund pelanggan.
 *
 * Fail-closed ke arah yang aman: status error/belum diketahui dibaca 'PENDING'
 * oleh hook → kartu KYC yang tampil, bukan form uang. Backend tetap penjaga
 * sesungguhnya (gerbang di service, di dalam transaksi).
 *
 * Aturan uangnya (batas min/maks, saldo tersedia, OTP wajib, pemetaan kode
 * error) tetap di `WithdrawForm`. Sumber rekening khusus mitra:
 * `/partners/me/bank-account` (nomor penuh).
 */
export default function WithdrawPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const [savedBank, setSavedBank] = useState<SavedBankAccount | null>(null);
  const { data: verification, isLoading: verificationLoading } = usePartnerVerificationStatus(isAuthorized);

  const kycApproved = verification === 'APPROVED';

  const fetchSavedBank = useCallback(async () => {
    const res = await fetchAPI<SavedBankAccount>('/partners/me/bank-account');
    if (res.success && res.data) setSavedBank(res.data);
  }, []);

  useEffect(() => {
    if (isAuthorized && kycApproved) fetchSavedBank();
  }, [isAuthorized, kycApproved, fetchSavedBank]);

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="pb-6">
      <MitraPageHeader
        title="Tarik Dana"
        variant="form"
        backHref="/mitra/wallet"
        breadcrumbs={[{ label: 'Dompet', href: '/mitra/wallet' }, { label: 'Tarik Dana' }]}
      />

      {/* Tidak ada <h1> kedua di sini: MitraPageHeader sudah `alwaysShow`, jadi
          judulnya tampil di desktop juga . dua-duanya berarti dua H1. */}
      <MitraPageContainer variant="form">
        {verificationLoading ? (
          <PageSkeleton />
        ) : kycApproved ? (
          <WithdrawForm
            bankAccount={savedBank}
            bankAccountHref="/mitra/bank-account"
            successHref="/mitra/wallet"
            trackEvent="partner_withdrawal_submitted"
          />
        ) : (
          <div className="rounded-2xl border border-brand-gray-100 bg-white p-5 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-brand-warning-dark" />
            <h2 className="mt-3 text-base font-bold text-brand-gray-900">
              {verification === 'REJECTED' ? 'Verifikasi Identitasmu Ditolak' : 'Verifikasi Dulu untuk Tarik Dana'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-gray-700">
              Saldomu aman dan terus bertambah dari pesanan yang selesai. Untuk mencairkannya, kami
              perlu memverifikasi identitasmu satu kali: KTP, swafoto, dan rekening bank tujuan.
              {verification === 'REJECTED' &&
                ' Pengajuan sebelumnya ditolak . lihat alasannya lalu ajukan ulang.'}
            </p>
            <Link
              href={verification === 'REJECTED' ? '/mitra/verification-status' : '/mitra/kyc'}
              className="mt-4 inline-block rounded-md bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-brand-red-dark"
            >
              {verification === 'REJECTED' ? 'Lihat Status & Ajukan Ulang' : 'Mulai Verifikasi'}
            </Link>
          </div>
        )}
      </MitraPageContainer>
    </div>
  );
}
