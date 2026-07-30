"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Package, ArrowLeft, Search } from 'lucide-react';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  // Pendapatan bersih mitra (setelah komisi platform). Ini yang ditampilkan
  // sebagai penghasilan — bukan total_amount (bruto yang dibayar pelanggan).
  partner_amount?: number;
  partner_amount_estimated?: boolean;
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

  // K1-interim: polling senyap 45s agar order baru/perubahan status muncul tanpa
  // reload manual (belum ada push/WS real-time). Hanya saat tab terlihat.
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchOrders(true);
      }
    }, 45000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
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

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      <div className="bg-white border-b border-brand-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 px-4 py-4">
            <button onClick={() => router.push('/mitra/dashboard')} className="p-2 -ml-2 hover:bg-brand-gray-60 rounded" aria-label="Kembali">
              <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
            </button>
            <h1 className="text-base font-bold text-brand-gray-900">Daftar Pesanan</h1>
          </div>

          <div className="px-4 pb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-brand-gray-450 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pesanan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-brand-gray-60 border border-brand-gray-100 rounded-lg p-2.5 pl-9 text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide border-t border-brand-gray-100 pt-3">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${activeFilter === f.key ? 'bg-brand-red text-white border-brand-red' : 'bg-white text-brand-gray-700 border-brand-gray-100'}`}
              >
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeFilter === f.key ? 'bg-white/25 text-white' : 'bg-brand-gray-100 text-brand-gray-700'}`}>
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
            <div key={i} className="bg-white rounded-xl border border-brand-gray-100 p-4 h-28 animate-pulse" />
          ))
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-10">
            <Package className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />
            <p className="text-sm text-brand-gray-700">Belum ada pesanan{activeFilter !== 'all' ? ' dengan status ini' : ''}.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <Link key={order.id} href={`/mitra/orders/${order.id}`} className="block bg-white border border-brand-gray-100 rounded-md p-4 hover:border-brand-red transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-brand-gray-450 font-medium mb-0.5">No. {order.order_number}</p>
                  <p className="font-bold text-brand-gray-900">{customerName(order)}</p>
                </div>
                <StatusBadge status={order.status} size="sm" />
              </div>

              <div className="flex justify-between items-end border-t border-brand-gray-100 pt-3">
                <div className="flex items-center gap-1.5 text-sm text-brand-gray-700">
                  <Calendar className="w-4 h-4 text-brand-gray-450" />
                  <span>{formatTime(order.scheduled_at)}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-red">
                    {formatPrice(order.partner_amount ?? 0)}
                    {order.partner_amount_estimated && (
                      <span className="ml-1 text-[10px] font-normal text-brand-gray-450">est.</span>
                    )}
                  </p>
                  <p className="text-[10px] text-brand-gray-450 mt-0.5">Pendapatan mitra</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
