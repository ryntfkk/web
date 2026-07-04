"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, History, Search } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

interface Transaction {
  id: string;
  order_number?: string;
  type: 'ORDER_PAYMENT' | 'TOPUP' | 'WITHDRAW' | 'REFUND';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  created_at: string;
  description: string;
  payment_method?: string;
}

export default function TransactionsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/users/transactions');
    if (res.success && res.data) {
      setTransactions(res.data.data ?? res.data);
    }
    setLoading(false);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const filteredData = transactions.filter(t => {
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) || 
                        (t.order_number?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'ALL' || t.status === filter;
    return matchSearch && matchFilter;
  });

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Riwayat Transaksi</h1>
        </div>
        
        {/* Filters */}
        <div className="max-w-lg mx-auto px-4 pb-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9e8e8c] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari deskripsi atau no pesanan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#f7f5f4] border-none rounded p-2.5 pl-9 text-sm text-[#1c1b1b] focus:outline-none focus:ring-1 focus:ring-[#b51822]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {['ALL', 'SUCCESS', 'PENDING', 'FAILED'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                  filter === f
                    ? 'bg-[#b51822] text-white border-[#b51822]'
                    : 'bg-white text-[#5b403e] border-[#e5e2e1] hover:bg-[#f7f5f4]'
                }`}
              >
                {f === 'ALL' ? 'Semua' : f === 'SUCCESS' ? 'Berhasil' : f === 'PENDING' ? 'Tertunda' : 'Gagal'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-[#e5e2e1] p-4 space-y-3 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 bg-[#e5e2e1] rounded w-1/2" />
                <div className="h-4 bg-[#e5e2e1] rounded w-1/4" />
              </div>
              <div className="h-3 bg-[#e5e2e1] rounded w-1/3" />
            </div>
          ))
        ) : filteredData.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-[#e5e2e1]">
            <History className="w-12 h-12 text-[#e5e2e1] mx-auto mb-3" />
            <p className="text-sm text-[#5b403e]">Tidak ada transaksi ditemukan.</p>
          </div>
        ) : (
          filteredData.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-[#e5e2e1] p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-[#1c1b1b]">{t.description}</p>
                  {t.order_number && <p className="text-xs text-[#9e8e8c] mt-0.5">Pesanan: {t.order_number}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#1c1b1b]">{formatPrice(t.amount)}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#e5e2e1]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#9e8e8c]">{new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  {t.payment_method && <span className="text-[10px] bg-[#f7f5f4] text-[#5b403e] px-1.5 py-0.5 rounded font-medium">{t.payment_method}</span>}
                </div>
                <div>
                  {t.status === 'SUCCESS' && <span className="text-[10px] font-bold text-[#38A169] bg-[#F0FFF4] px-2 py-0.5 rounded uppercase">Berhasil</span>}
                  {t.status === 'PENDING' && <span className="text-[10px] font-bold text-[#DD6B20] bg-[#FFFAF0] px-2 py-0.5 rounded uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Tertunda</span>}
                  {t.status === 'FAILED' && <span className="text-[10px] font-bold text-[#E53E3E] bg-[#FFF5F5] px-2 py-0.5 rounded uppercase">Gagal</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
