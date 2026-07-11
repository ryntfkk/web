"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Package, ArrowLeft, Search, Filter } from 'lucide-react';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';
import { ROLE_PARTNER } from '@/lib/constants';
import MitraBottomNav from '@/components/layout/MitraBottomNav';


interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  scheduled_at: string;
  customer_name: string;
}

export default function MitraOrdersPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth(ROLE_PARTNER);
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  useEffect(() => {
    
    
    fetchOrders();
  }, [isAuthenticated, user?.active_role]);

  const fetchOrders = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/orders?role=partner');
    if (res.success && res.data) {
      setOrders(res.data);
    }
    setLoading(false);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  const formatTime = (t: string) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const isActiveStatus = (status: OrderStatus) => 
    !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(status);

  const filteredOrders = orders.filter(o => {
    const matchSearch = o.order_number.toLowerCase().includes(search.toLowerCase()) || 
                        o.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'ACTIVE' ? isActiveStatus(o.status) : !isActiveStatus(o.status);
    return matchSearch && matchTab;
  });

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 lg:top-16 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 px-4 py-4">
            <button onClick={() => router.push('/mitra/dashboard')} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </button>
            <h1 className="text-base font-bold text-[#1c1b1b]">Daftar Pesanan</h1>
          </div>
          
          <div className="px-4 pb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9e8e8c] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pesanan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#f7f5f4] border border-[#e5e2e1] rounded-lg p-2.5 pl-9 text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
            <button className="p-2.5 bg-[#f7f5f4] border border-[#e5e2e1] rounded-lg text-[#5b403e]">
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-4 border-t border-[#e5e2e1]">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'ACTIVE' ? 'border-[#b51822] text-[#b51822]' : 'border-transparent text-[#9e8e8c]'}`}
            >
              Aktif
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'HISTORY' ? 'border-[#b51822] text-[#b51822]' : 'border-transparent text-[#9e8e8c]'}`}
            >
              Riwayat
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-[#e5e2e1] p-4 h-28 animate-pulse" />
          ))
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-10">
            <Package className="w-12 h-12 text-[#e5e2e1] mx-auto mb-3" />
            <p className="text-sm text-[#5b403e]">Belum ada pesanan {activeTab === 'ACTIVE' ? 'aktif' : 'di riwayat'}.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <Link key={order.id} href={`/mitra/orders/${order.id}`} className="block bg-white border border-[#e5e2e1] rounded-md p-4 hover:border-[#b51822] transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-[#9e8e8c] font-medium mb-0.5">#{order.order_number}</p>
                  <p className="font-bold text-[#1c1b1b]">{order.customer_name}</p>
                </div>
                <StatusBadge status={order.status} size="sm" />
              </div>
              
              <div className="flex justify-between items-end border-t border-[#e5e2e1] pt-3">
                <div className="flex items-center gap-1.5 text-sm text-[#5b403e]">
                  <Calendar className="w-4 h-4 text-[#9e8e8c]" />
                  <span>{formatTime(order.scheduled_at)}</span>
                </div>
                <p className="font-bold text-[#b51822]">{formatPrice(order.total_amount)}</p>
              </div>
            </Link>
          ))
        )}
      </div>
      <MitraBottomNav />
    </div>
  );
}

