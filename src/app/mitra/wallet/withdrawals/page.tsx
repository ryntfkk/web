'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote, CheckCircle2, Clock, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/format';
import DataState from '@/components/mitra/DataState';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';

/**
 * Riwayat penarikan sebagai ENTITAS, bukan baris mutasi (P2).
 *
 * Halaman dompet hanya menampilkan `wallet_transactions`, dan di sana sebuah
 * penarikan hanya berupa satu baris DEBIT: mitra tidak bisa melihat penarikan
 * mana yang ditolak, kapan diproses, ke rekening mana, dan mengapa gagal.
 * Semua itu hidup di tabel `withdrawals` dan sekarang punya layarnya sendiri.
 */
type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED';

interface Withdrawal {
  id: string;
  amount: number;
  admin_fee: number;
  net_amount: number;
  bank_name: string;
  bank_code: string;
  account_number_masked: string;
  account_name: string;
  status: WithdrawalStatus;
  failure_reason?: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
}

const STATUS_META: Record<
  WithdrawalStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  PENDING: { label: 'Menunggu diproses', className: 'bg-brand-warning-light text-brand-amber-dark', icon: Clock },
  PROCESSING: { label: 'Sedang diproses', className: 'bg-brand-warning-light text-brand-amber-dark', icon: Clock },
  COMPLETED: { label: 'Berhasil', className: 'bg-brand-success-soft text-brand-success', icon: CheckCircle2 },
  REJECTED: { label: 'Ditolak', className: 'bg-brand-error-soft text-brand-error', icon: XCircle },
  FAILED: { label: 'Gagal', className: 'bg-brand-error-soft text-brand-error', icon: XCircle },
};

const FILTERS: { value: '' | WithdrawalStatus; label: string }[] = [
  { value: '', label: 'Semua' },
  { value: 'PENDING', label: 'Diproses' },
  { value: 'COMPLETED', label: 'Berhasil' },
  { value: 'REJECTED', label: 'Ditolak' },
];

const PER_PAGE = 20;

function formatDateTime(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MitraWithdrawalsPage() {
  const { isLoading: authLoading, isAuthorized, isAuthenticated } = useRequireAuth();

  const [items, setItems] = useState<Withdrawal[]>([]);
  const [status, setStatus] = useState<'' | WithdrawalStatus>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number, targetStatus: '' | WithdrawalStatus) => {
      const append = targetPage > 1;
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams({ page: String(targetPage), per_page: String(PER_PAGE) });
      if (targetStatus) params.set('status', targetStatus);

      const res = await fetchAPI<Withdrawal[]>(`/wallet/withdrawals?${params.toString()}`);
      if (res.success) {
        const list = res.data ?? [];
        // Menambah, bukan menimpa, saat "muat lebih banyak" — dan menimpa, bukan
        // menambah, saat filter berganti.
        setItems((prev) => (append ? [...prev, ...list] : list));
        setTotal(res.pagination?.total ?? list.length);
        setError(null);
      } else {
        // Gagal memuat TIDAK boleh tampak seperti "belum pernah menarik dana".
        setError(res.message || 'Gagal memuat riwayat penarikan');
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthenticated) return;
    setPage(1);
    fetchPage(1, status);
  }, [isAuthenticated, status, fetchPage]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, status);
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      <MitraPageHeader
        title="Riwayat Penarikan"
        backHref="/mitra/wallet"
        variant="list"
        breadcrumbs={[
          { label: 'Dompet', href: '/mitra/wallet' },
          { label: 'Riwayat Penarikan' },
        ]}
      />

      <MitraPageContainer variant="list" className="py-6">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => setStatus(f.value)}
              className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                status === f.value
                  ? 'border-brand-red bg-brand-error-soft text-brand-red'
                  : 'border-brand-gray-100 bg-white text-brand-gray-700 hover:text-brand-gray-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <DataState
          isLoading={loading}
          error={error}
          onRetry={() => fetchPage(1, status)}
          isEmpty={items.length === 0}
          emptyIcon={<Banknote className="mx-auto mb-3 h-12 w-12 text-brand-gray-100" />}
          emptyTitle={status ? 'Tidak ada penarikan dengan status ini.' : 'Belum ada penarikan dana.'}
          emptyDescription={
            status ? undefined : 'Penarikan yang kamu ajukan dari dompet akan tercatat di sini.'
          }
        >
          <ul className="space-y-3">
            {items.map((w) => {
              const meta = STATUS_META[w.status] ?? STATUS_META.PENDING;
              const StatusIcon = meta.icon;
              return (
                <li key={w.id} className="rounded-lg border border-brand-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-brand-gray-900">{formatPrice(w.net_amount)}</p>
                      <p className="mt-0.5 text-xs text-brand-gray-450">
                        {formatPrice(w.amount)} dikurangi biaya admin {formatPrice(w.admin_fee)}
                      </p>
                    </div>
                    {/* Status tidak pernah hanya warna — selalu ikon + teks (§6.3). */}
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${meta.className}`}
                    >
                      <StatusIcon className="h-3 w-3" aria-hidden />
                      {meta.label}
                    </span>
                  </div>

                  <dl className="mt-3 space-y-1 border-t border-brand-gray-100 pt-3 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-brand-gray-450">Rekening tujuan</dt>
                      <dd className="text-right font-medium text-brand-gray-900">
                        {w.bank_name || w.bank_code} {w.account_number_masked}
                        <span className="block font-normal text-brand-gray-450">{w.account_name}</span>
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-brand-gray-450">Diajukan</dt>
                      <dd className="text-brand-gray-700">{formatDateTime(w.requested_at)}</dd>
                    </div>
                    {w.completed_at && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-brand-gray-450">Selesai</dt>
                        <dd className="text-brand-gray-700">{formatDateTime(w.completed_at)}</dd>
                      </div>
                    )}
                    {!w.completed_at && w.processed_at && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-brand-gray-450">Diproses</dt>
                        <dd className="text-brand-gray-700">{formatDateTime(w.processed_at)}</dd>
                      </div>
                    )}
                  </dl>

                  {w.failure_reason && (
                    <p className="mt-3 rounded-md bg-brand-error-soft px-3 py-2 text-xs text-brand-error">
                      <span className="font-semibold">Alasan: </span>
                      {w.failure_reason}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {items.length < total && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Memuat…' : `Muat lebih banyak (${items.length}/${total})`}
              </Button>
            </div>
          )}
        </DataState>
      </MitraPageContainer>
    </div>
  );
}
