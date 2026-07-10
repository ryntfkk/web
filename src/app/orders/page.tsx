"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Calendar, MapPin, ChevronRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { normalizeOrder } from '@/lib/order-utils';
import { StatusBadge } from '@/components/ui/status-badge';

interface OrderItem {
  id: string;
  service_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  service_date?: string;
  scheduled_at?: string;
  service_address?: string;
  address?: string;
  partner_name?: string;
  partner_avatar?: string;
  items: OrderItem[];
  notes?: string;
  agreed_price?: number;
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled';

// Pemetaan status backend → grup filter UI.
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

export default function OrdersPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchOrders = async () => {
    setLoading(true);
    const res = await fetchAPI<unknown>('/orders', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.success && res.data) {
      // Respons bisa berupa array langsung ATAU envelope { data: [...] }
      const list = Array.isArray(res.data)
        ? res.data
        : (res.data as { data?: unknown[] })?.data;
      if (Array.isArray(list)) {
        setOrders(list.map(normalizeOrder) as Order[]);
      }
    }
    setLoading(false);
  };

  const filteredOrders = orders.filter(order => matchesFilter(order.status, activeFilter));

  const filterCounts = {
    all: orders.length,
    pending: orders.filter(o => matchesFilter(o.status, 'pending')).length,
    processing: orders.filter(o => matchesFilter(o.status, 'processing')).length,
    completed: orders.filter(o => matchesFilter(o.status, 'completed')).length,
    cancelled: orders.filter(o => matchesFilter(o.status, 'cancelled')).length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-20 md:pb-8">
      <style dangerouslySetInnerHTML={{
        __html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />

      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded-[2px]">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </Link>
            <h1 className="text-lg font-bold text-[#1c1b1b]">Riwayat Pesanan</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 max-w-full">

          <div className="w-full lg:w-64 shrink-0 min-w-0">
            <div className="bg-white rounded-[2px] border border-[#e5e2e1] overflow-hidden">
              <div className="hidden lg:block p-4 border-b border-[#e5e2e1]">
                <h3 className="font-semibold text-[#32201f]">Filter</h3>
              </div>

              <div
                className="flex flex-row overflow-x-auto lg:flex-col divide-x lg:divide-x-0 lg:divide-y divide-[#e5e2e1] scrollbar-hide touch-pan-x w-full"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {[
                  { key: 'all' as FilterStatus, label: 'Semua' },
                  { key: 'pending' as FilterStatus, label: 'Menunggu' },
                  { key: 'processing' as FilterStatus, label: 'Sedang Berlangsung' },
                  { key: 'completed' as FilterStatus, label: 'Selesai' },
                  { key: 'cancelled' as FilterStatus, label: 'Dibatalkan' },
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={`shrink-0 lg:w-full flex items-center justify-between p-4 hover:bg-[#f7f5f4] transition-colors text-left outline-none ${activeFilter === filter.key ? 'bg-[#fdf2f2]' : ''
                      }`}
                  >
                    <span className={`text-sm font-medium whitespace-nowrap mr-3 lg:mr-0 ${activeFilter === filter.key ? 'text-[#b51822]' : 'text-[#32201f]'
                      }`}>
                      {filter.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-[2px] shrink-0 ${activeFilter === filter.key
                        ? 'bg-[#b51822] text-white'
                        : 'bg-[#e5e2e1] text-[#5b403e]'
                      }`}>
                      {filterCounts[filter.key]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 min-w-0">
            {loading ? (
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-[2px] border border-[#e5e2e1] p-4 animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="h-4 w-32 bg-[#e5e2e1] rounded-[2px] mb-2"></div>
                        <div className="h-3 w-24 bg-[#e5e2e1] rounded-[2px]"></div>
                      </div>
                      <div className="h-6 w-20 bg-[#e5e2e1] rounded-[2px]"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-[#e5e2e1] rounded-[2px]"></div>
                      <div className="h-3 w-3/4 bg-[#e5e2e1] rounded-[2px]"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-[2px] border border-[#e5e2e1] p-8 text-center">
                <Package className="w-16 h-16 text-[#8f6f6d]/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#32201f] mb-2">
                  {activeFilter === 'all' ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan'}
                </h3>
                <p className="text-sm text-[#8f6f6d] mb-6">
                  {activeFilter === 'all'
                    ? 'Anda belum memiliki pesanan. Mulai pesan jasa sekarang!'
                    : 'Tidak ada pesanan dengan status ini.'}
                </p>
                {activeFilter === 'all' && (
                  <Button onClick={() => router.push('/')} className="rounded-[2px]">
                    Cari Jasa
                  </Button>
                )}
              </div>
            ) : (
              filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-[2px] border border-[#e5e2e1] overflow-hidden">
                    <div className="p-4 border-b border-[#e5e2e1] bg-[#f7f5f4]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#32201f]">{order.order_number}</p>
                          <p className="text-xs text-[#8f6f6d] flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <StatusBadge status={order.status as any} className="self-start sm:self-auto" />
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="space-y-2 mb-4">
                        {order.items?.slice(0, 2).map(item => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 shrink-0 bg-[#f7f5f4] rounded-[2px] flex items-center justify-center">
                                <Package className="w-4 h-4 text-[#8f6f6d]" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#32201f] truncate">{item.service_name || (item as any).name}</p>
                                <p className="text-xs text-[#8f6f6d]">x{item.quantity}</p>
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-[#32201f] self-end sm:self-auto">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                        {order.items && order.items.length > 2 && (
                          <p className="text-xs text-[#8f6f6d] pl-10">
                            +{order.items.length - 2} layanan lainnya
                          </p>
                        )}
                      </div>

                      {/* Partner Info */}
                      {order.partner_name && (
                        <div className="flex items-center gap-3 p-3 bg-[#f7f5f4] rounded-[2px] mb-4">
                          <div className="w-10 h-10 shrink-0 bg-[#e5e2e1] rounded-[2px] flex items-center justify-center text-sm font-bold text-[#5b403e]">
                            {order.partner_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#32201f] truncate">{order.partner_name}</p>
                            <p className="text-xs text-[#8f6f6d]">Mitra</p>
                          </div>
                        </div>
                      )}

                      {/* Service Info */}
                      {order.service_date || order.scheduled_at ? (
                        <div className="flex items-center gap-2 text-xs text-[#8f6f6d] mb-4">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span className="truncate">Jadwal: {formatDate(order.service_date || order.scheduled_at || '')}</span>
                        </div>
                      ) : null}

                      {order.service_address || order.address ? (
                        <div className="flex items-center gap-2 text-xs text-[#8f6f6d] mb-4">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate">{order.service_address || order.address}</span>
                        </div>
                      ) : null}

                      {/* Footer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-[#e5e2e1] gap-4">
                        <div>
                          <p className="text-xs text-[#8f6f6d]">Total</p>
                          <p className="text-lg font-bold text-[#b51822]">{formatPrice(order.total_amount || order.agreed_price || 0)}</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {order.status === 'WAITING_PAYMENT' && (
                            <Link href={`/payment/${order.id}`} className="flex-1 sm:flex-none">
                              <Button size="sm" className="w-full bg-[#DD6B20] hover:bg-[#C05621] rounded-[2px]">
                                Bayar
                              </Button>
                            </Link>
                          )}
                          {order.status === 'COMPLETED' && (
                            <Link href={`/orders/${order.id}/review`} className="flex-1 sm:flex-none">
                              <Button size="sm" variant="secondary" className="w-full border-[#e5e2e1] text-[#5b403e] rounded-[2px]">
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Ulasan
                              </Button>
                            </Link>
                          )}
                          <Link href={`/orders/${order.id}`} className="flex-1 sm:flex-none">
                            <Button size="sm" className="w-full bg-[#b51822] hover:bg-[#90121a] rounded-[2px]">
                              Detail
                              <ChevronRight className="w-4 h-4 ml-1 shrink-0" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}