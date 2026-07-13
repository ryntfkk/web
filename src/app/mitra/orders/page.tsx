"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Package, ArrowLeft, Search } from 'lucide-react';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  scheduled_at: string;
  // Backend mengirim nama pelanggan di dalam customer_info, bukan customer_name.
  customer_info?: { id?: string; name?: string; phone?: string };
  customer_name?: string; // fallback bila API lama
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled';

// Pemetaan status backend ke grup filter UI (identik dengan page /orders pelanggan).
// Status backend: WAITING_CONFIRMATION, WAITING_PAYMENT, PAID, IN_PROGRESS,
// WAITING_ADDITIONAL_PAY, WAITING_CUSTOMER_CONFIRM, COMPLETED, CANCELLED, DISPUTED
const FILTER_GROUPS: Record<Exclude<FilterStatus, 'all'>, string[]> = {
  pending: ['WAITING_CONFIRMATION', 'WAITING_PAYMENT', 'PENDING', 'ACCEPTED'],
  processing: ['PAID', 'IN_PROGRESS', 'WAITING_ADDITIONAL_PAY', 'WAITING_CUSTOMER_CONFIRM', 'DISPUTED', 'PROCESSING'],
  completed: ['COMPLETED'],
  cancelled: ['CANCELLED'],
};

function matchesFilter(status: string, filter: FilterStatus): boolean {
  if (filter === 'all') return true;
  return FILTER_GROUPS[filter].includes(status);
}

// Ambil nama pelanggan apa pun bentuk payload-nya.
function customerName(o: Order): string {
  return o.customer_info?.name || o.customer_name || 'Pelanggan';
}

export default function MitraOrdersPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrders();
  }, [isAuthenticated, user?.active_role]);

  const fetchOrders = async () => {
    setLoading(true);
    const res = await fetchAPI<unknown>('/orders?role=partner', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.success && res.data) {
      // Respons bisa berupa array langsung ATAU envelope { data: [...] }
      const list = Array.isArray(res.data)
        ? res.data
        : (res.data as { data?: unknown[] })?.data;
      if (Array.isArray(list)) {
        setOrders(list as Order[]);
      }
    }
    setLoading(false);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  const formatTime = (t: string) => t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = q === '' ||
      o.order_number.toLowerCase().includes(q) ||
      customerName(o).toLowerCase().includes(q);
    return matchSearch && matchesFilter(o.status, activeFilter);
  });

  const filterCounts = {
    all: orders.length,
    pending: orders.filter(o => matchesFilter(o.status, 'pending')).length,
    processing: orders.filter(o => matchesFilter(o.status, 'processing')).length,
    completed: orders.filter(o => matchesFilter(o.status, 'completed')).length,
    cancelled: orders.filter(o => matchesFilter(o.status, 'cancelled')).length,
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Menunggu' },
    { key: 'processing', label: 'Sedang Berlangsung' },
    { key: 'completed', label: 'Selesai' },
    { key: 'cancelled', label: 'Dibatalkan' },
  ];

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
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
          </div>

          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide border-t border-[#e5e2e1] pt-3">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${activeFilter === f.key ? 'bg-[#b51822] text-white border-[#b51822]' : 'bg-white text-[#5b403e] border-[#e5e2e1]'}`}
              >
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeFilter === f.key ? 'bg-white/25 text-white' : 'bg-[#e5e2e1] text-[#5b403e]'}`}>
                  {filterCounts[f.key]}
                </span>
              </button>
            ))}
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
            <p className="text-sm text-[#5b403e]">Belum ada pesanan{activeFilter !== 'all' ? ' dengan status ini' : ''}.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <Link key={order.id} href={`/mitra/orders/${order.id}`} className="block bg-white border border-[#e5e2e1] rounded-md p-4 hover:border-[#b51822] transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-[#9e8e8c] font-medium mb-0.5">No. {order.order_number}</p>
                  <p className="font-bold text-[#1c1b1b]">{customerName(order)}</p>
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
    </div>
  );
}
