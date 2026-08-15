"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { formatRupiah as formatPrice } from '@/lib/format';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ROLE_PARTNER } from '@/lib/constants';


interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  category: 'EARNING' | 'REFUND' | 'WITHDRAWAL' | 'PAYMENT';
  amount: number;
  // Enum backend (DEVELOPER_NOTES §"Angka dompet ada TIGA"):
  // PENDING|PAID|REFUNDED|FAILED|DISBURSED. **Tidak ada `SUCCESS`** . tipe di
  // sini dulu mencantumkannya, jadi cabang mana pun yang menunggu 'SUCCESS'
  // tak akan pernah menyala.
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED' | 'DISBURSED';
  created_at: string;
  description: string;
}

export default function WalletPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [timeFilter, setTimeFilter] = useState<'THIS_MONTH' | 'LAST_3_MONTHS' | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  // Tiga angka, bukan satu: saldo buku, yang sedang diproses, dan yang benar-
  // benar bisa ditarik. Menampilkan saldo buku saja membuat pengguna mengira
  // seluruhnya bisa dicairkan padahal penarikan berjalan sudah menguncinya.
  const [balance, setBalance] = useState({ ledger: 0, available: 0, pending: 0 });
  // Bentuk field mengikuti TransactionSummary backend:
  // total_earnings / total_withdrawals / total_refunds.
  const [summary, setSummary] = useState({ total_earnings: 0, total_withdrawals: 0, total_refunds: 0 });

  // Mitra punya dompetnya sendiri di /mitra/wallet (lengkap dgn info batas &
  // SLA); halaman ini tetap bisa terbuka untuk mereka lewat tautan lama, jadi
  // tujuan tombolnya mengikuti peran yang sedang aktif.
  const isPartner = user?.active_role === ROLE_PARTNER;
  const withdrawHref = isPartner ? '/mitra/wallet/withdraw' : '/profile/wallet/withdraw';
  const historyHref = isPartner ? '/mitra/wallet/withdrawals' : '/profile/wallet/withdrawals';

  useEffect(() => {
    if (isAuthenticated) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, timeFilter]);

  async function fetchData() {
    setLoading(true);
    let query = '';
    if (timeFilter === 'THIS_MONTH') {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      query = `?start_date=${start}&end_date=${end}`;
    } else if (timeFilter === 'LAST_3_MONTHS') {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth() - 2, 1).toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      query = `?start_date=${start}&end_date=${end}`;
    }

    try {
      const [txRes, balRes] = await Promise.all([
        fetchAPI<{ data?: WalletTransaction[]; summary?: typeof summary }>(`/wallet/transactions${query}`),
        fetchAPI<{ balance?: number; available_balance?: number; pending_withdrawal?: number }>('/wallet/balance'),
      ]);

      if (txRes.success && txRes.data) {
        setTransactions(txRes.data.data || []);
        if (txRes.data.summary) {
          setSummary({
            total_earnings: txRes.data.summary.total_earnings || 0,
            total_withdrawals: txRes.data.summary.total_withdrawals || 0,
            total_refunds: txRes.data.summary.total_refunds || 0,
          });
        }
      }

      if (balRes.success && balRes.data) {
        const ledger = balRes.data.balance || 0;
        setBalance({
          ledger,
          available: balRes.data.available_balance ?? ledger,
          pending: balRes.data.pending_withdrawal || 0,
        });
      }
    } catch (e) {
      console.error("Failed to fetch wallet data:", e);
    } finally {
      setLoading(false);
    }
  };

  function getTransactionIcon(type: string) {
    if (type === 'CREDIT') return <ArrowDownLeft className="w-5 h-5 text-brand-success" />;
    if (type === 'DEBIT') return <ArrowUpRight className="w-5 h-5 text-brand-error" />;
    return <History className="w-5 h-5 text-brand-gray-450" />;
  };

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  if (!isAuthorized) return null;

  const visibleTransactions = transactions.filter((t) =>
    filterType === 'ALL' ? true : filterType === 'IN' ? t.type === 'CREDIT' : t.type === 'DEBIT',
  );

  return (
    <div className="page-h bg-brand-gray-60 pb-20 lg:pb-10">
      {/* Pita saldo TIDAK sticky.
          Sebagai `sticky top-0` blok merah setinggi ±160px ini ikut turun saat
          digulir dan menutupi riwayat transaksi di bawahnya . bug yang sudah
          didiagnosis untuk dompet mitra dan dilarang oleh penjaga
          `layout-conventions.test.ts`, tapi penjaga itu hanya memindai /mitra
          sehingga salinan di sisi pelanggan bertahan. */}
      <div className="bg-brand-red text-white px-4 pt-4 pb-8 rounded-b-3xl shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push(isPartner ? '/mitra/dashboard' : '/profile')}
              className="p-2 -ml-2 hover:bg-white/10 rounded"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold">Dompet {isPartner ? 'Mitra' : 'Posko'}</h1>
          </div>

          <div className="flex items-center justify-between">
            <div>
              {/* Angka utama = yang BISA DITARIK. Menonjolkan saldo buku membuat
                  pengguna mengira seluruhnya bisa dicairkan. */}
              <p className="text-sm text-white/80 mb-1">Saldo Bisa Ditarik</p>
              <h2 className="text-3xl font-bold tracking-tight">{formatPrice(balance.available)}</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-white/80">
                <span>Total saldo: {formatPrice(balance.ledger)}</span>
                {balance.pending > 0 && <span>Sedang diproses: {formatPrice(balance.pending)}</span>}
              </div>
            </div>
            <WalletIcon className="w-10 h-10 text-white/20" />
          </div>
        </div>
      </div>

      {/* Dana refund pembatalan/no-show mendarat di saldo ini, dan Kebijakan
          Pembatalan menjanjikan dana itu "dapat langsung dipakai atau ditarik".
          Sebelum ini pelanggan bisa melihat saldonya tapi tidak punya satu pun
          tombol untuk mengambilnya. */}
      <div className="max-w-2xl mx-auto px-4 -mt-4 relative z-10 flex gap-3">
        <Button
          className="flex-1 bg-white hover:bg-brand-gray-60 text-brand-gray-900 shadow-sm border border-brand-gray-100 h-12 rounded-md font-bold"
          onClick={() => router.push(withdrawHref)}
        >
          <ArrowUpRight className="w-5 h-5 mr-2 text-brand-red" /> Tarik Dana
        </Button>
        {/* Penarikan punya lifecycle sendiri (ditolak, alasannya, ke rekening
            mana) yang tak muat di baris mutasi . karenanya layar terpisah. */}
        <Button
          variant="outline"
          className="flex-1 bg-white hover:bg-brand-gray-60 text-brand-gray-900 shadow-sm border border-brand-gray-100 h-12 rounded-md font-bold"
          onClick={() => router.push(historyHref)}
        >
          <History className="w-5 h-5 mr-2 text-brand-gray-700" /> Riwayat Penarikan
        </Button>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 flex gap-4">
        <div className="flex-1 bg-white rounded-xl border border-brand-gray-100 p-3 shadow-sm">
          <p className="text-xs text-brand-gray-700 mb-1">Total Pemasukan</p>
          {/* Mitra: pemasukan = earnings saja (refund adalah dana yang dikembalikan
              ke pelanggan, bukan pendapatan mitra). Pelanggan: refund = dana masuk. */}
          <p className="font-bold text-brand-success">
            {formatPrice(isPartner ? summary.total_earnings : summary.total_earnings + summary.total_refunds)}
          </p>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-brand-gray-100 p-3 shadow-sm">
          {/* Label ini dulu "Total Pengeluaran" padahal isinya HANYA penarikan:
              pembayaran pesanan dari saldo (DEBIT kategori PAYMENT) tidak ikut,
              sehingga pelanggan yang membayar Rp 500rb dari dompet melihat
              "Rp 0" tepat di atas riwayat yang menampilkan transaksinya.
              Angka pengeluaran yang sesungguhnya butuh field baru di
              TransactionSummary backend (belum ada `total_payments`); sampai
              itu ada, labelnya menyebut apa yang benar-benar dihitung. */}
          <p className="text-xs text-brand-gray-700 mb-1">Total Penarikan</p>
          <p className="font-bold text-brand-error">{formatPrice(summary.total_withdrawals)}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-brand-gray-900">Riwayat Transaksi</h3>
          <label className="sr-only" htmlFor="wallet-time-filter">Rentang waktu</label>
          <select
            id="wallet-time-filter"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
            className="text-xs border border-brand-gray-100 rounded-md px-2 py-1 text-brand-gray-700 bg-white focus:outline-none focus:border-brand-red"
          >
            <option value="ALL">Semua Waktu</option>
            <option value="THIS_MONTH">Bulan Ini</option>
            <option value="LAST_3_MONTHS">3 Bulan Terakhir</option>
          </select>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex bg-white rounded-lg border border-brand-gray-100 p-1 shadow-sm">
            {([
              { key: 'ALL', label: 'Semua', active: 'bg-brand-gray-60 text-brand-gray-900' },
              { key: 'IN', label: 'Masuk', active: 'bg-brand-success-soft text-brand-success' },
              { key: 'OUT', label: 'Keluar', active: 'bg-brand-error-soft text-brand-error' },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                aria-pressed={filterType === f.key}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterType === f.key ? f.active : 'text-brand-gray-450 hover:text-brand-gray-700'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-brand-gray-100 p-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-brand-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-brand-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-brand-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))
          ) : visibleTransactions.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-brand-gray-100">
              <History className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />
              <p className="text-sm text-brand-gray-700">Belum ada transaksi.</p>
            </div>
          ) : (
            visibleTransactions.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-brand-gray-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'CREDIT' ? 'bg-brand-success-soft' : 'bg-brand-error-soft'}`}>
                    {getTransactionIcon(t.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-gray-900">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-brand-gray-450">
                        {new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {t.status === 'PENDING' && (
                        <span className="bg-brand-warning-light text-brand-amber-dark text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Menunggu
                        </span>
                      )}
                      {/* Transaksi GAGAL sebelumnya tidak ditandai sama sekali .
                          hanya PENDING yang punya lencana . sehingga baris yang
                          gagal terbaca seperti berhasil. */}
                      {t.status === 'FAILED' && (
                        <span className="bg-brand-error-soft text-brand-error text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Gagal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <p className={`text-sm font-bold ${t.status === 'FAILED' ? 'text-brand-gray-450 line-through' : t.type === 'CREDIT' ? 'text-brand-success' : 'text-brand-gray-900'}`}>
                    {t.type === 'CREDIT' ? '+' : '-'}{formatPrice(t.amount)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
