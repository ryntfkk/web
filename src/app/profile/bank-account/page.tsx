'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import BankAccountForm from '@/components/wallet/BankAccountForm';

/**
 * Rekening bank PELANGGAN . tujuan pencairan saldo refund.
 *
 * Tanpa layar ini tombol "Tarik Dana" di dompet pelanggan selalu berujung
 * "silakan tambahkan rekening bank terlebih dahulu" tanpa satu pun jalan untuk
 * menambahkannya . `/mitra/bank-account` dipagari `MitraLayoutClient`, yang
 * memulangkan siapa pun yang bukan mitra.
 *
 * Tidak ada gerbang "terkunci" di sini: penguncian rekening (F1) berlaku untuk
 * mitra yang rekening payout-nya sudah diverifikasi admin, dan tidak ada yang
 * memverifikasi rekening pelanggan.
 */
export default function CustomerBankAccountPage() {
  const { isLoading: authLoading, isAuthorized, isAuthenticated } = useRequireAuth();

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-20 lg:pb-10">
      <MobilePageHeader title="Rekening Bank" titleAs="p" backHref="/profile/wallet" maxWidthClass="max-w-2xl" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-6">Rekening Bank</h1>
        <BankAccountForm
          enabled={isAuthenticated}
          intro="Rekening ini menjadi tujuan saat kamu mencairkan saldo dompet, misalnya dana pengembalian dari pesanan yang dibatalkan."
        />
      </div>
    </div>
  );
}
