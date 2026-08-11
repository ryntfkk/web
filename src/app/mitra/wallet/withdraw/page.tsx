"use client";

import { useCallback, useEffect, useState } from 'react';

import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import { PageSkeleton } from '@/components/ui/skeleton';
import WithdrawForm, { type SavedBankAccount } from '@/components/wallet/WithdrawForm';

/**
 * Penarikan dana mitra . kerangka + sumber rekening saja.
 *
 * Aturan uangnya (batas min/maks, saldo tersedia, OTP wajib, pemetaan kode
 * error) ada di `WithdrawForm`, yang dipakai bersama halaman pelanggan
 * `/profile/wallet/withdraw`. Ketiga endpoint yang dipanggilnya tidak punya
 * gerbang peran . lihat catatan A04-T1 di `backend/internal/wallet/handler.go`.
 *
 * Yang khusus mitra di sini hanya SUMBER rekening: `/partners/me/bank-account`
 * mengirim nomor rekening penuh, sedangkan `/wallet/balance` (yang dipakai
 * halaman pelanggan) hanya mengirim versi tersamar.
 */
export default function WithdrawPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const [savedBank, setSavedBank] = useState<SavedBankAccount | null>(null);

  const fetchSavedBank = useCallback(async () => {
    const res = await fetchAPI<SavedBankAccount>('/partners/me/bank-account');
    if (res.success && res.data) setSavedBank(res.data);
  }, []);

  useEffect(() => {
    if (isAuthorized) fetchSavedBank();
  }, [isAuthorized, fetchSavedBank]);

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
        <WithdrawForm
          bankAccount={savedBank}
          bankAccountHref="/mitra/bank-account"
          successHref="/mitra/wallet"
          trackEvent="partner_withdrawal_submitted"
        />
      </MitraPageContainer>
    </div>
  );
}
