"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { formatRupiah as formatPrice } from '@/lib/format';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ROLE_PARTNER } from '@/lib/constants';


interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  category: 'EARNING' | 'REFUND' | 'WITHDRAWAL' | 'PAYMENT';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
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
  const [balance, setBalance] = useState(0);
  // Bentuk field mengikuti TransactionSummary backend:
  // total_earnings / total_withdrawals / total_refunds.
  const [summary, setSummary] = useState({ total_earnings: 0, total_withdrawals: 0, total_refunds: 0 });

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, timeFilter]);

  const fetchData = async () => {
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
        fetchAPI<any>(`/wallet/transactions${query}`),
        fetchAPI<any>('/wallet/balance')
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
        setBalance(balRes.data.balance || 0);
      }
    } catch (e) {
      console.error("Failed to fetch wallet data:", e);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string, category: string) => {
    if (type === 'CREDIT') {
      return <ArrowDownLeft className="w-5 h-5 text-brand-success" />;
    } else if (type === 'DEBIT') {
      return <ArrowUpRight className="w-5 h-5 text-brand-error" />;
    }
    return <History className="w-5 h-5 text-brand-gray-450" />;
  };

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      {/* Header */}
      <div className="bg-brand-red text-white px-4 pt-4 pb-8 rounded-b-3xl shadow-sm sticky top-0 lg:top-16 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => user?.active_role === ROLE_PARTNER ? router.push('/mitra/dashboard') : router.push('/profile')} className="p-2 -ml-2 hover:bg-white/10 rounded">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold">Dompet {user?.active_role === ROLE_PARTNER ? 'Mitra' : 'Posko'}</h1>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 mb-1">Total Saldo</p>
              <h2 className="text-3xl font-bold tracking-tight">{formatPrice(balance)}</h2>
            </div>
            <WalletIcon className="w-10 h-10 text-white/20" />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 flex gap-4">
        <div className="flex-1 bg-white rounded-xl border border-brand-gray-100 p-3 shadow-sm">
          <p className="text-xs text-brand-gray-700 mb-1">Total Pemasukan</p>
          {/* Mitra: pemasukan = earnings saja (refund adalah dana yang dikembalikan
              ke pelanggan, bukan pendapatan mitra). Pelanggan: refund = dana masuk. */}
          <p className="font-bold text-brand-success">{formatPrice(user?.active_role === ROLE_PARTNER ? summary.total_earnings : summary.total_earnings + summary.total_refunds)}</p>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-brand-gray-100 p-3 shadow-sm">
          <p className="text-xs text-brand-gray-700 mb-1">Total Pengeluaran</p>
          <p className="font-bold text-brand-error">{formatPrice(summary.total_withdrawals)}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-brand-gray-900">Riwayat Transaksi</h3>
          <select 
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="text-xs border border-brand-gray-100 rounded-md px-2 py-1 text-brand-gray-700 bg-white focus:outline-none focus:border-brand-red"
          >
            <option value="ALL">Semua Waktu</option>
            <option value="THIS_MONTH">Bulan Ini</option>
            <option value="LAST_3_MONTHS">3 Bulan Terakhir</option>
          </select>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex bg-white rounded-lg border border-brand-gray-100 p-1 shadow-sm">
            <button 
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterType === 'ALL' ? 'bg-brand-gray-60 text-brand-gray-900' : 'text-brand-gray-450 hover:text-brand-gray-700'}`}
            >
              Semua
            </button>
            <button 
              onClick={() => setFilterType('IN')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterType === 'IN' ? 'bg-brand-success-soft text-brand-success' : 'text-brand-gray-450 hover:text-brand-gray-700'}`}
            >
              Masuk
            </button>
            <button 
              onClick={() => setFilterType('OUT')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterType === 'OUT' ? 'bg-brand-error-soft text-brand-error' : 'text-brand-gray-450 hover:text-brand-gray-700'}`}
            >
              Keluar
            </button>
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
          ) : transactions.filter(t => filterType === 'ALL' ? true : filterType === 'IN' ? t.type === 'CREDIT' : t.type === 'DEBIT').length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-brand-gray-100">
              <History className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />
              <p className="text-sm text-brand-gray-700">Belum ada transaksi.</p>
            </div>
          ) : (
            transactions.filter(t => filterType === 'ALL' ? true : filterType === 'IN' ? t.type === 'CREDIT' : t.type === 'DEBIT').map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-brand-gray-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'CREDIT' ? 'bg-brand-success-soft' : 'bg-brand-error-soft'}`}>
                    {getTransactionIcon(t.type, t.category)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-gray-900">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-brand-gray-450">{new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {t.status === 'PENDING' && (
                        <span className="bg-brand-warning-light text-brand-amber-dark text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${t.type === 'CREDIT' ? 'text-brand-success' : 'text-brand-gray-900'}`}>
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

