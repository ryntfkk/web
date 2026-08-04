"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Package, ArrowLeft, Search } from 'lucide-react';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
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
  // Paginasi & hitungan datang dari SERVER (P1-01). Sebelumnya seluruhnya
  // dihitung dari 10 baris pertama, jadi filter, pencarian, dan badge tab
  // semuanya hanya mewakili halaman pertama.
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, pending: 0, processing: 0, completed: 0, cancelled: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  /** `append` = tombol "Muat lebih banyak"; tanpa itu halaman diganti. */
  const fetchOrders = useCallback(async (opts: { silent?: boolean; pageToLoad?: number; append?: boolean } = {}) => {
    const { silent = false, pageToLoad = 1, append = false } = opts;
    if (!silent && !append) setLoading(true);
    if (append) setLoadingMore(true);

    const group = activeFilter === 'all' ? '' : `&status_group=${activeFilter}`;
    const res = await fetchAPI<Order[]>(
      `/orders?role=partner&page=${pageToLoad}&limit=${PAGE_SIZE}${group}`,
      { method: 'GET', credentials: 'include' },
    );

    if (res.success) {
      const list = Array.isArray(res.data) ? res.data : [];
      setOrders(prev => (append ? [...prev, ...list] : list));
      setTotal(res.pagination?.total ?? list.length);
      setPage(pageToLoad);
      setError(null);
    } else if (!silent) {
      // Gagal memuat BUKAN "tidak punya pesanan" (P1-11). Menyamakan keduanya
      // membuat mitra mengira pesanannya hilang.
      setError(res.message || 'Gagal memuat pesanan');
    }

    setLoading(false);
    setLoadingMore(false);
  }, [activeFilter]);

  /** Badge tab dihitung server atas SELURUH pesanan, bukan halaman yang termuat. */
  const fetchCounts = useCallback(async () => {
    const res = await fetchAPI<{ total: number; pending: number; processing: number; completed: number; cancelled: number }>(
      '/orders/summary',
    );
    if (res.success && res.data) {
      setCounts({
        all: res.data.total,
        pending: res.data.pending,
        processing: res.data.processing,
        completed: res.data.completed,
        cancelled: res.data.cancelled,
      });
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrders({ pageToLoad: 1 });
    fetchCounts();
  }, [isAuthenticated, user?.active_role, fetchOrders, fetchCounts]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // K1-interim: polling senyap 45s agar order baru/perubahan status muncul tanpa
  // reload manual (belum ada push/WS real-time). Hanya saat tab terlihat.
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchOrders({ silent: true, pageToLoad: 1 });
        fetchCounts();
      }
    }, 45000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  const formatTime = (t: string) => t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

  // Status difilter SERVER; di sini tinggal pencarian teks atas baris yang
  // sudah termuat. Pencarian lintas seluruh riwayat butuh dukungan backend
  // tersendiri — jangan berpura-pura sudah punya.
  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    return q === '' ||
      o.order_number.toLowerCase().includes(q) ||
      customerName(o).toLowerCase().includes(q);
  });

  const filterCounts = counts;
  const hasMore = orders.length < total;

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
        ) : error ? (
          /* Gagal memuat dibedakan dari "belum ada pesanan" (P1-11): menyamakan
             keduanya membuat mitra mengira pesanannya hilang. */
          <div className="text-center py-10">
            <p className="text-sm font-semibold text-brand-gray-900 mb-1">Gagal memuat pesanan</p>
            <p className="text-xs text-brand-gray-450 mb-4">{error}</p>
            <Button variant="outline" onClick={() => fetchOrders({ pageToLoad: 1 })}>Coba Lagi</Button>
          </div>
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

        {!loading && !error && hasMore && (
          <div className="pt-2 text-center">
            <Button
              variant="outline"
              className="w-full"
              isLoading={loadingMore}
              onClick={() => fetchOrders({ pageToLoad: page + 1, append: true })}
            >
              Muat lebih banyak
            </Button>
            <p className="mt-2 text-xs text-brand-gray-450">
              Menampilkan {orders.length} dari {total} pesanan
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
