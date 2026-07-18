"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';

interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  category: 'EARNING' | 'REFUND' | 'WITHDRAWAL' | 'PAYMENT';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  created_at: string;
  description: string;
}

export default function MitraWalletPage() {
  const { isLoading: authLoading, isAuthorized, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [timeFilter, setTimeFilter] = useState<'THIS_MONTH' | 'LAST_3_MONTHS' | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
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

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const getTransactionIcon = (type: string) => {
    if (type === 'CREDIT') return <ArrowDownLeft className="w-5 h-5 text-[#38A169]" />;
    if (type === 'DEBIT') return <ArrowUpRight className="w-5 h-5 text-[#E53E3E]" />;
    return <History className="w-5 h-5 text-[#9e8e8c]" />;
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-[#b51822] text-white px-4 pt-4 pb-8 rounded-b-3xl shadow-sm sticky top-0 lg:top-16 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.push('/mitra/dashboard')} className="p-2 -ml-2 hover:bg-white/10 rounded">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold">Dompet Mitra</h1>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 mb-1">Total Saldo Pendapatan</p>
              <h2 className="text-3xl font-bold tracking-tight">{formatPrice(balance)}</h2>
            </div>
            <WalletIcon className="w-10 h-10 text-white/20" />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 relative z-20 flex gap-3">
        <Button
          className="flex-1 bg-white hover:bg-gray-50 text-[#1c1b1b] shadow-sm border border-[#e5e2e1] h-12 rounded-xl font-bold"
          onClick={() => router.push('/mitra/wallet/withdraw')}
        >
          <ArrowUpRight className="w-5 h-5 mr-2 text-[#b51822]" /> Tarik Dana
        </Button>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4">
        <div className="bg-[#FFF5F5] border border-[#FEB2B2] rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-[#b51822] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[#b51822] mb-0.5">Info Penarikan Dana</p>
            <p className="text-xs text-[#b51822] leading-snug">
              Batas penarikan: <strong>Rp 10.000.000 per pengajuan</strong>. Dana masuk ke rekening dalam <strong>1-2 hari kerja</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 flex gap-4">
        <div className="flex-1 bg-white rounded-xl border border-[#e5e2e1] p-4 shadow-sm flex flex-col items-center text-center">
          <p className="text-xs text-[#5b403e] mb-1 font-medium">Total Pemasukan</p>
          <p className="font-bold text-[#38A169] text-lg">{formatPrice(summary.total_earnings)}</p>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-[#e5e2e1] p-4 shadow-sm flex flex-col items-center text-center">
          <p className="text-xs text-[#5b403e] mb-1 font-medium">Total Penarikan</p>
          <p className="font-bold text-[#1c1b1b] text-lg">{formatPrice(summary.total_withdrawals)}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#1c1b1b]">Riwayat Transaksi</h3>
          <select 
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="text-xs border border-[#e5e2e1] rounded-md px-2 py-1 text-[#5b403e] bg-white focus:outline-none focus:border-[#b51822]"
          >
            <option value="ALL">Semua Waktu</option>
            <option value="THIS_MONTH">Bulan Ini</option>
            <option value="LAST_3_MONTHS">3 Bulan Terakhir</option>
          </select>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex w-full bg-white rounded-lg border border-[#e5e2e1] p-1 shadow-sm">
            <button 
              onClick={() => setFilterType('ALL')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${filterType === 'ALL' ? 'bg-[#f7f5f4] text-[#1c1b1b]' : 'text-[#9e8e8c] hover:text-[#5b403e]'}`}
            >
              Semua
            </button>
            <button 
              onClick={() => setFilterType('IN')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${filterType === 'IN' ? 'bg-[#F0FFF4] text-[#38A169]' : 'text-[#9e8e8c] hover:text-[#5b403e]'}`}
            >
              Pemasukan
            </button>
            <button 
              onClick={() => setFilterType('OUT')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${filterType === 'OUT' ? 'bg-[#FFF5F5] text-[#E53E3E]' : 'text-[#9e8e8c] hover:text-[#5b403e]'}`}
            >
              Penarikan
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-[#e5e2e1] p-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-[#e5e2e1]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#e5e2e1] rounded w-1/2" />
                  <div className="h-3 bg-[#e5e2e1] rounded w-1/3" />
                </div>
              </div>
            ))
          ) : transactions.filter(t => filterType === 'ALL' ? true : filterType === 'IN' ? t.type === 'CREDIT' : t.type === 'DEBIT').length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-[#e5e2e1]">
              <History className="w-12 h-12 text-[#e5e2e1] mx-auto mb-3" />
              <p className="text-sm text-[#5b403e]">Belum ada transaksi.</p>
            </div>
          ) : (
            transactions.filter(t => filterType === 'ALL' ? true : filterType === 'IN' ? t.type === 'CREDIT' : t.type === 'DEBIT').map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-[#e5e2e1] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'CREDIT' ? 'bg-[#F0FFF4]' : 'bg-[#FFF5F5]'}`}>
                    {getTransactionIcon(t.type)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1c1b1b]">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#9e8e8c]">{new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {t.status === 'PENDING' && (
                        <span className="bg-[#FEFCBF] text-[#B7791F] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${t.type === 'CREDIT' ? 'text-[#38A169]' : 'text-[#1c1b1b]'}`}>
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
