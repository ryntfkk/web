"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/format';
import { toDateParam } from '@/lib/date';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import MitraSection from '@/components/mitra/MitraSection';
import MitraInfoBanner from '@/components/mitra/MitraInfoBanner';
import DataState from '@/components/mitra/DataState';

interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  category: 'EARNING' | 'REFUND' | 'WITHDRAWAL' | 'PAYMENT';
  amount: number;
  /**
   * Enum backend (transaction_status), bukan karangan frontend. Dulu diketik
   * 'SUCCESS' yang TIDAK PERNAH dikirim server, sehingga kondisi apa pun yang
   * membandingkannya diam-diam tidak pernah benar (P1-06).
   */
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED' | 'DISBURSED';
  created_at: string;
  description: string;
}

interface TransactionsResponse {
  data: WalletTransaction[];
  summary?: { total_earnings?: number; total_withdrawals?: number; total_refunds?: number };
}

interface BalanceResponse {
  balance?: number;
  available_balance?: number;
  pending_withdrawal?: number;
}

/** Sama dengan default per_page backend (wallet/handler.go). */
const PAGE_SIZE = 20;


export default function MitraWalletPage() {
  const { isLoading: authLoading, isAuthorized, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [timeFilter, setTimeFilter] = useState<'THIS_MONTH' | 'LAST_3_MONTHS' | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  // Paginasi server (page/per_page didukung wallet/handler.go). Dulu hanya
  // halaman pertama yang pernah termuat . mutasi ke-21 dan seterusnya tak
  // terjangkau dari UI mana pun.
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tiga angka berbeda, dan mitra berhak tahu bedanya (P1-04): yang bisa
  // ditarik sekarang, yang sedang diproses penarikannya, dan total buku.
  const [balance, setBalance] = useState({ ledger: 0, available: 0, pending: 0 });
  const [summary, setSummary] = useState({ total_earnings: 0, total_withdrawals: 0, total_refunds: 0 });
  const platformConfig = usePlatformConfig();


  /** `append` = tombol "Muat lebih banyak"; tanpa itu daftar diganti. */
  const fetchData = useCallback(async (opts: { pageToLoad?: number; append?: boolean } = {}) => {
    const { pageToLoad = 1, append = false } = opts;
    if (append) setLoadingMore(true);
    else setLoading(true);

    const params = new URLSearchParams({ page: String(pageToLoad), per_page: String(PAGE_SIZE) });
    // Pemasukan/Penarikan disaring SERVER (`type` di wallet/handler.go), bukan
    // di klien. Menyaring array yang dipaginasi server membuat "Penarikan"
    // tampil kosong hanya karena 20 baris pertama kebetulan semuanya EARNING .
    // dan tombol "Muat lebih banyak" ikut hilang bersama keadaan kosong itu,
    // jadi halaman berikutnya tak pernah bisa dijangkau.
    if (filterType === 'IN') params.set('type', 'CREDIT');
    else if (filterType === 'OUT') params.set('type', 'DEBIT');
    if (timeFilter === 'THIS_MONTH') {
      const d = new Date();
      params.set('start_date', toDateParam(new Date(d.getFullYear(), d.getMonth(), 1)));
      params.set('end_date', toDateParam(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
    } else if (timeFilter === 'LAST_3_MONTHS') {
      const d = new Date();
      params.set('start_date', toDateParam(new Date(d.getFullYear(), d.getMonth() - 2, 1)));
      params.set('end_date', toDateParam(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
    }

    try {
      const [txRes, balRes] = await Promise.all([
        fetchAPI<TransactionsResponse>(`/wallet/transactions?${params.toString()}`),
        fetchAPI<BalanceResponse>('/wallet/balance')
      ]);

      if (!txRes.success) {
        // Kegagalan memuat TIDAK boleh tampak seperti "belum ada transaksi":
        // mitra akan mengira mutasinya hilang (P1-05/P1-11).
        setError(txRes.message || 'Gagal memuat riwayat transaksi');
      } else {
        setError(null);
      }
      if (txRes.success && txRes.data) {
        const list = txRes.data.data || [];
        setTransactions(prev => (append ? [...prev, ...list] : list));
        // Total dari server, bukan panjang array . dasar tombol muat-lagi.
        setTotal(txRes.pagination?.total ?? list.length);
        setPage(pageToLoad);
        if (txRes.data.summary) {
          setSummary({
            total_earnings: txRes.data.summary.total_earnings || 0,
            total_withdrawals: txRes.data.summary.total_withdrawals || 0,
            total_refunds: txRes.data.summary.total_refunds || 0,
          });
        }
      }

      if (balRes.success && balRes.data) {
        const bal = (balRes.data as { balance?: number; available_balance?: number; pending_withdrawal?: number });
        setBalance({
          ledger: bal?.balance ?? 0,
          available: bal?.available_balance ?? bal?.balance ?? 0,
          pending: bal?.pending_withdrawal ?? 0,
        });
      }
    } catch (e) {
      console.error("Failed to fetch wallet data:", e);
      setError('Tidak dapat memuat data dompet. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [timeFilter, filterType]);


  // Sinkronisasi dari sistem LUAR (API) saat mount . state di sini memang
  // berasal dari server, bukan turunan props, jadi aturan ini tidak berlaku.
  // Pola yang sama & alasannya ada di components/wallet/WithdrawForm.tsx.
  /* eslint-disable react-hooks/set-state-in-effect -- sinkronisasi dari API, bukan state turunan props */
  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const getTransactionIcon = (type: string) => {
    if (type === 'CREDIT') return <ArrowDownLeft className="w-5 h-5 text-brand-success" />;
    if (type === 'DEBIT') return <ArrowUpRight className="w-5 h-5 text-brand-error" />;
    return <History className="w-5 h-5 text-brand-gray-450" />;
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  // Tak ada penyaringan di klien lagi . `transactions` sudah berisi tepat apa
  // yang diminta (lihat parameter `type` di fetchData).
  const isFiltered = filterType !== 'ALL' || timeFilter !== 'ALL';

  return (
    <>
      {/* Pita merah penuh selebar area konten; isinya tetap di dalam kontainer.

          `relative z-10`, BUKAN `sticky`: pita ini setinggi ~160px dan seluruh
          blok di bawahnya tidak punya `position`, jadi versi sticky-nya ikut
          turun saat digulir lalu menutupi riwayat transaksi. Pola yang sama di
          dashboard memang sudah `relative` . z-10 hanya supaya baris tombol
          (z-20) yang menimpanya lewat `-mt-4` tetap tampil di atas. */}
      <div className="bg-brand-red text-white rounded-b-xl shadow-sm relative z-10">
        <MitraPageContainer variant="detail" className="pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => router.push('/mitra/dashboard')} className="p-2 -ml-2 hover:bg-white/10 rounded-md" aria-label="Kembali">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold">Dompet Mitra</h1>
          </div>

          <div className="flex items-center justify-between">
            <div>
              {/* Angka utama = yang BISA DITARIK. Menonjolkan saldo buku membuat
                  mitra mengira seluruhnya bisa dicairkan (P1-04). */}
              <p className="text-sm text-white/80 mb-1">Saldo Bisa Ditarik</p>
              <h2 className="text-3xl font-bold tracking-tight">{formatPrice(balance.available)}</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-white/80">
                <span>Total saldo: {formatPrice(balance.ledger)}</span>
                {balance.pending > 0 && (
                  <span>Sedang diproses: {formatPrice(balance.pending)}</span>
                )}
              </div>
            </div>
            <WalletIcon className="w-10 h-10 text-white/20" />
          </div>
        </MitraPageContainer>
      </div>

      <MitraPageContainer variant="detail" className="py-0 -mt-4 relative z-20 flex gap-3">
        <Button
          className="flex-1 bg-white hover:bg-brand-gray-60 text-brand-gray-900 shadow-sm border border-brand-gray-100 h-12 rounded-md font-bold"
          onClick={() => router.push('/mitra/wallet/withdraw')}
        >
          <ArrowUpRight className="w-5 h-5 mr-2 text-brand-red" /> Tarik Dana
        </Button>
        {/* Penarikan punya lifecycle sendiri (ditolak, alasannya, ke rekening
            mana) yang tak muat di baris mutasi . karenanya layar terpisah. */}
        <Button
          variant="outline"
          className="flex-1 bg-white hover:bg-brand-gray-60 text-brand-gray-900 shadow-sm border border-brand-gray-100 h-12 rounded-md font-bold"
          onClick={() => router.push('/mitra/wallet/withdrawals')}
        >
          <History className="w-5 h-5 mr-2 text-brand-gray-700" /> Riwayat Penarikan
        </Button>
      </MitraPageContainer>

      {/* Desktop: ruangnya dipakai untuk KOLOM, bukan meregangkan kartu. Rail
          ditulis lebih dulu di DOM supaya urutan bacanya di ponsel tetap
          "info & ringkasan → riwayat"; di `lg` grid menempatkannya di kanan. */}
      <MitraPageContainer variant="detail" className="pt-4 lg:grid lg:grid-cols-[1fr_360px] lg:gap-5 lg:items-start space-y-6 lg:space-y-0">
        <div className="space-y-4 lg:col-start-2 lg:row-start-1">
          {/* Batas & SLA dari DB (platform_settings + platform_profile) .
              tidak ada angka maupun janji waktu yang diketik di sini. */}
          <MitraInfoBanner variant="error" icon={<Clock className="h-4 w-4" aria-hidden />} title="Info Penarikan Dana">
            Batas penarikan: <strong>{formatPrice(platformConfig.max_withdrawal)} per pengajuan</strong>. Dana masuk ke rekening dalam <strong>{platformConfig.profile?.withdrawal_sla || '1-2 hari kerja'}</strong>.
          </MitraInfoBanner>

          <div className="grid grid-cols-2 gap-3">
            {/* Kedua angka ini SEPANJANG MASA . `GetWalletTransactionSummary`
                hanya menerima userID, tanpa filter periode maupun tipe. Ia
                dipajang berdampingan dengan pemilih "Bulan Ini / 3 Bulan
                Terakhir", jadi tanpa keterangan periodenya pembaca wajar
                mengira angkanya ikut tersaring. */}
            <div className="bg-white rounded-lg border border-brand-gray-100 p-3 shadow-sm flex flex-col items-center text-center">
              <p className="text-xs text-brand-gray-700 mb-1 font-medium">Total Pemasukan</p>
              <p className="font-bold text-brand-success text-lg">{formatPrice(summary.total_earnings)}</p>
              <p className="mt-0.5 text-[11px] text-brand-gray-450">Sepanjang masa</p>
            </div>
            <div className="bg-white rounded-lg border border-brand-gray-100 p-3 shadow-sm flex flex-col items-center text-center">
              <p className="text-xs text-brand-gray-700 mb-1 font-medium">Total Penarikan</p>
              <p className="font-bold text-brand-gray-900 text-lg">{formatPrice(summary.total_withdrawals)}</p>
              <p className="mt-0.5 text-[11px] text-brand-gray-450">Sepanjang masa</p>
            </div>
          </div>
        </div>

        <MitraSection
          className="min-w-0 lg:col-start-1 lg:row-start-1"
          title="Riwayat Transaksi"
          action={
            <select
              aria-label="Rentang waktu"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as 'THIS_MONTH' | 'LAST_3_MONTHS' | 'ALL')}
              className="text-xs border border-brand-gray-100 rounded-md px-2 py-1 text-brand-gray-700 bg-white focus:outline-none focus:border-brand-red"
            >
              <option value="ALL">Semua Waktu</option>
              <option value="THIS_MONTH">Bulan Ini</option>
              <option value="LAST_3_MONTHS">3 Bulan Terakhir</option>
            </select>
          }
        >
        <div className="flex items-center justify-between mb-4">
          <div className="flex w-full bg-white rounded-lg border border-brand-gray-100 p-1 shadow-sm">
            <button
              type="button"
              aria-pressed={filterType === 'ALL'}
              onClick={() => setFilterType('ALL')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${filterType === 'ALL' ? 'bg-brand-gray-60 text-brand-gray-900' : 'text-brand-gray-450 hover:text-brand-gray-700'}`}
            >
              Semua
            </button>
            <button
              type="button"
              aria-pressed={filterType === 'IN'}
              onClick={() => setFilterType('IN')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${filterType === 'IN' ? 'bg-brand-success-soft text-brand-success' : 'text-brand-gray-450 hover:text-brand-gray-700'}`}
            >
              Pemasukan
            </button>
            <button
              type="button"
              aria-pressed={filterType === 'OUT'}
              onClick={() => setFilterType('OUT')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${filterType === 'OUT' ? 'bg-brand-error-soft text-brand-error' : 'text-brand-gray-450 hover:text-brand-gray-700'}`}
            >
              Penarikan
            </button>
          </div>
        </div>

        <DataState
          isLoading={loading}
          error={error}
          onRetry={fetchData}
          isEmpty={transactions.length === 0}
          emptyIcon={<History className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />}
          // Kosong karena filter ≠ belum punya transaksi sama sekali. Kalimat
          // yang sama untuk keduanya membuat mitra mengira mutasinya hilang.
          emptyTitle={isFiltered ? 'Tidak ada transaksi pada filter ini.' : 'Belum ada transaksi.'}
          skeleton={
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg border border-brand-gray-100 p-3 flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-brand-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-brand-gray-100 rounded-md w-1/2" />
                    <div className="h-3 bg-brand-gray-100 rounded-md w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <div className="space-y-3">
            {transactions.map(t => (
              <div key={t.id} className="bg-white rounded-lg border border-brand-gray-100 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.type === 'CREDIT' ? 'bg-brand-success-soft' : 'bg-brand-error-soft'}`}>
                    {getTransactionIcon(t.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-gray-900">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-brand-gray-450">{new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {t.status === 'PENDING' && (
                        <span className="bg-brand-warning-light text-brand-amber-dark text-[11px] font-bold px-1.5 py-0.5 rounded-md uppercase flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${t.type === 'CREDIT' ? 'text-brand-success' : 'text-brand-gray-900'}`}>
                    {t.type === 'CREDIT' ? '+' : '-'}{formatPrice(t.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {transactions.length < total && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                className="w-full"
                isLoading={loadingMore}
                onClick={() => fetchData({ pageToLoad: page + 1, append: true })}
              >
                Muat lebih banyak
              </Button>
              <p className="mt-2 text-xs text-brand-gray-450">
                Menampilkan {transactions.length} dari {total} transaksi
              </p>
            </div>
          )}
        </DataState>
        </MitraSection>
      </MitraPageContainer>
    </>
  );
}
