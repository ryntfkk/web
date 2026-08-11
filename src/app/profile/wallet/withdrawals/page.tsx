'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import WithdrawalHistoryList from '@/components/wallet/WithdrawalHistoryList';

/**
 * Riwayat penarikan PELANGGAN.
 *
 * Isinya komponen yang sama dengan `/mitra/wallet/withdrawals` .
 * `GET /wallet/withdrawals` tidak punya gerbang peran, dan sebuah penarikan
 * yang ditolak (beserta alasannya, dan ke rekening mana) tidak pernah muncul di
 * baris `wallet_transactions`. Tanpa layar ini, pelanggan yang penarikannya
 * gagal tidak punya cara tahu mengapa.
 */
export default function CustomerWithdrawalsPage() {
  const { isLoading: authLoading, isAuthorized, isAuthenticated } = useRequireAuth();

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-20 lg:pb-10">
      {/* titleAs="p": H1 halaman ada di badan konten. Tanpa ini HTML berisi dua
          H1 sekaligus (A6) . lihat catatan di MobilePageHeader. */}
      <MobilePageHeader title="Riwayat Penarikan" titleAs="p" backHref="/profile/wallet" maxWidthClass="max-w-2xl" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-6">Riwayat Penarikan</h1>
        <WithdrawalHistoryList enabled={isAuthenticated} listClassName="grid gap-3" />
      </div>
    </div>
  );
}
