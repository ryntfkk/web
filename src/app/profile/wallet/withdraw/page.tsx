'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import WithdrawForm, { type SavedBankAccount } from '@/components/wallet/WithdrawForm';

/**
 * Penarikan dana PELANGGAN.
 *
 * Kenapa pelanggan punya saldo sama sekali: refund pembatalan & no-show
 * mengkredit dompet pelanggan (`CreditCustomerWallet`), dan Kebijakan
 * Pembatalan yang sudah terbit menjanjikan dana itu "dapat langsung dipakai
 * atau ditarik". Backend sudah mencabut `RequireRole("partner")` dari
 * `/wallet/withdraw*` untuk itu (A04-T1) . yang tertinggal hanya layarnya.
 *
 * Rekening tujuan dibaca dari `/wallet/balance` (bukan `/partners/me/...`):
 * respons itu sudah memuat `bank_account`, jadi tidak perlu request kedua ke
 * endpoint ber-namespace mitra.
 */
export default function CustomerWithdrawPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const [bankAccount, setBankAccount] = useState<SavedBankAccount | null>(null);

  const fetchBankAccount = useCallback(async () => {
    const res = await fetchAPI<{ bank_account?: SavedBankAccount }>('/wallet/balance');
    if (res.success && res.data?.bank_account) setBankAccount(res.data.bank_account);
  }, []);

  useEffect(() => {
    if (isAuthorized) fetchBankAccount();
  }, [isAuthorized, fetchBankAccount]);

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-20 lg:pb-10">
      <MobilePageHeader title="Tarik Dana" titleAs="p" backHref="/profile/wallet" maxWidthClass="max-w-2xl" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-6">Tarik Dana</h1>
        <WithdrawForm
          bankAccount={bankAccount}
          bankAccountHref="/profile/bank-account"
          successHref="/profile/wallet"
          trackEvent="customer_withdrawal_submitted"
        />
      </div>
    </div>
  );
}
