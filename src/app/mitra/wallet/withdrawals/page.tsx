'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import WithdrawalHistoryList from '@/components/wallet/WithdrawalHistoryList';

/**
 * Riwayat penarikan mitra . kerangka saja.
 *
 * Isinya `WithdrawalHistoryList`, yang dipakai bersama halaman pelanggan
 * (`/profile/wallet/withdrawals`): `GET /wallet/withdrawals` tidak punya
 * gerbang peran, jadi aturan status & bentuk kartunya harus hidup di satu
 * tempat . dua salinan pasti menyimpang.
 */
export default function MitraWithdrawalsPage() {
  const { isLoading: authLoading, isAuthorized, isAuthenticated } = useRequireAuth();

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="pb-6">
      <MitraPageHeader
        title="Riwayat Penarikan"
        backHref="/mitra/wallet"
        variant="list"
        breadcrumbs={[
          { label: 'Dompet', href: '/mitra/wallet' },
          { label: 'Riwayat Penarikan' },
        ]}
      />

      <MitraPageContainer variant="list">
        {/* Ruang desktop dipakai untuk KOLOM . satu kolom di 1152px hanya
            membuat tiap baris jadi pita panjang berisi empat angka. */}
        <WithdrawalHistoryList enabled={isAuthenticated} listClassName="grid gap-3 lg:grid-cols-2" />
      </MitraPageContainer>
    </div>
  );
}
