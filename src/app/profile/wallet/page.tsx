"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

interface WalletTransaction {
  id: string;
  type: 'TOPUP' | 'WITHDRAW' | 'PAYMENT' | 'REFUND' | 'INCOME';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  created_at: string;
  description: string;
}

export default function WalletPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/wallet/transactions');
    if (res.success && res.data) {
      setTransactions(res.data.data ?? res.data);
    }
    setLoading(false);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'INCOME':
      case 'REFUND':
      case 'TOPUP':
        return <ArrowDownLeft className="w-5 h-5 text-[#38A169]" />;
      case 'PAYMENT':
      case 'WITHDRAW':
        return <ArrowUpRight className="w-5 h-5 text-[#E53E3E]" />;
      default:
        return <History className="w-5 h-5 text-[#9e8e8c]" />;
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-[#b51822] text-white px-4 pt-4 pb-8 rounded-b-3xl shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-white/10 rounded">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold">Dompet Posko</h1>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 mb-1">Total Saldo</p>
              <h2 className="text-3xl font-bold tracking-tight">{formatPrice(user?.balance || 0)}</h2>
            </div>
            <WalletIcon className="w-10 h-10 text-white/20" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-lg mx-auto px-4 -mt-4 relative z-20 flex gap-3">
        <Button
          className="flex-1 bg-white hover:bg-gray-50 text-[#b51822] shadow-sm border border-[#e5e2e1] h-12 rounded-xl"
          onClick={() => router.push('/profile/wallet/topup')}
        >
          <ArrowDownLeft className="w-4 h-4 mr-2" /> Top Up
        </Button>
        <Button
          className="flex-1 bg-white hover:bg-gray-50 text-[#1c1b1b] shadow-sm border border-[#e5e2e1] h-12 rounded-xl"
          onClick={() => router.push('/profile/wallet/withdraw')}
        >
          <ArrowUpRight className="w-4 h-4 mr-2" /> Tarik Dana
        </Button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h3 className="font-bold text-[#1c1b1b] mb-4">Riwayat Transaksi</h3>

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
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-[#e5e2e1]">
              <History className="w-12 h-12 text-[#e5e2e1] mx-auto mb-3" />
              <p className="text-sm text-[#5b403e]">Belum ada transaksi.</p>
            </div>
          ) : (
            transactions.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-[#e5e2e1] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${['INCOME', 'REFUND', 'TOPUP'].includes(t.type) ? 'bg-[#F0FFF4]' : 'bg-[#FFF5F5]'}`}>
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
                  <p className={`text-sm font-bold ${['INCOME', 'REFUND', 'TOPUP'].includes(t.type) ? 'text-[#38A169]' : 'text-[#1c1b1b]'}`}>
                    {['INCOME', 'REFUND', 'TOPUP'].includes(t.type) ? '+' : '-'}{formatPrice(t.amount)}
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
