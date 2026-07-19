"use client";

import { getInitial } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Package, Calendar, MapPin, ChevronRight, MessageSquare, Loader2, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { unwrapData, FilterStatus, matchesFilter } from '@/lib/order-utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { useCartStore } from '@/lib/store/cartStore';
import { useToast } from '@/components/ui/toast';
import { PLACEHOLDER_SERVICE } from '@/lib/images';

interface OrderItem {
  id: string;
  service_id?: string;
  service_name: string;
  name?: string;
  quantity: number;
  price: number;
  photo_url?: string;
  service_photo_url?: string;
}

// Respons GET /orders/:id/reorder
interface ReorderItem {
  service_id: string;
  service_name: string;
  quantity: number;
  photo_url?: string;
  original_price: number;
  current_price: number;
  available: boolean;
  price_changed: boolean;
}
interface ReorderResponse {
  partner_id: string;
  partner_username: string;
  partner_name: string;
  items: ReorderItem[];
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
  // API mengembalikan info mitra ter-nest di `partner` (bukan partner_name di root).
  partner?: { id: string; username: string; name: string; avatar_url?: string };
  items: OrderItem[];
  notes?: string;
  agreed_price?: number;
}

export default function OrdersPage() {
  // useRequireAuth menunggu isInitializing (silent refresh) selesai sebelum
  // redirect ke /login — mencegah hard-load mental ke login saat sesi masih ada.
  const { isLoading: authLoading, isAuthorized, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const { addItem } = useCartStore();
  const { showToast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI<unknown>('/orders', {
        method: 'GET',
        credentials: 'include',
      });
      if (res.success && res.data) {
        const unwrapped = unwrapData<unknown>(res.data);
        if (Array.isArray(unwrapped)) {
          setOrders(unwrapped as Order[]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      const res = await fetchAPI<ReorderResponse>(`/orders/${orderId}/reorder`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.success || !res.data) {
        showToast('Gagal memuat pesanan ulang', 'error');
        return;
      }
      const data = unwrapData<ReorderResponse>(res.data);
      const available = data.items.filter((i) => i.available);
      if (available.length === 0) {
        showToast('Layanan pada pesanan ini sudah tidak tersedia', 'error');
        return;
      }
      available.forEach((i) =>
        addItem({
          service_id: i.service_id,
          partner_id: data.partner_id,
          partner_username: data.partner_username,
          service_name: i.service_name,
          price: i.current_price,
          photo_url: i.photo_url || PLACEHOLDER_SERVICE,
        }),
      );
      const unavailable = data.items.length - available.length;
      const priceChanged = available.some((i) => i.price_changed);
      let msg = `${available.length} layanan ditambahkan ke keranjang`;
      if (unavailable > 0) msg += ` · ${unavailable} tak tersedia`;
      if (priceChanged) msg += ' · harga diperbarui';
      showToast(msg, unavailable > 0 || priceChanged ? 'info' : 'success');
      router.push('/cart');
    } finally {
      setReorderingId(null);
    }
  };

  const searchQuery = search.trim().toLowerCase();
  const filteredOrders = orders
    .filter(order => matchesFilter(order.status, activeFilter))
    .filter(order => {
      if (!searchQuery) return true;
      const inNumber = order.order_number?.toLowerCase().includes(searchQuery);
      const inPartner = order.partner_name?.toLowerCase().includes(searchQuery);
      const inItems = order.items?.some(it =>
        (it.service_name || it.name || '').toLowerCase().includes(searchQuery),
      );
      return Boolean(inNumber || inPartner || inItems);
    });

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

  if (authLoading) {
    return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="page-h bg-[#f7f5f4] pb-20 md:pb-8">

      {/* Header khusus mobile — di desktop TopNavbar sudah jadi satu-satunya header. */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 lg:hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded-md">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </Link>
            <h1 className="text-lg font-bold text-[#1c1b1b]">Riwayat Pesanan</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 overflow-hidden">
        <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b] mb-6">Riwayat Pesanan</h1>
        <div className="flex flex-col lg:flex-row gap-6 max-w-full">

          <div className="w-full lg:w-64 shrink-0 min-w-0">
            <div className="bg-white rounded-md border border-[#e5e2e1] overflow-hidden">
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
                    <span className={`text-xs px-2 py-0.5 rounded-md shrink-0 ${activeFilter === filter.key
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
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8f6f6d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari no. pesanan, mitra, atau layanan…"
                className="w-full pl-9 pr-3 py-2.5 rounded-md text-sm bg-white border border-[#e5e2e1] text-[#1c1b1b] focus:outline-none focus:border-[#b51822] focus:ring-1 focus:ring-[#b51822]"
              />
            </div>

            {loading ? (
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-md border border-[#e5e2e1] p-4 animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="h-4 w-32 bg-[#e5e2e1] rounded-md mb-2"></div>
                        <div className="h-3 w-24 bg-[#e5e2e1] rounded-md"></div>
                      </div>
                      <div className="h-6 w-20 bg-[#e5e2e1] rounded-md"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-[#e5e2e1] rounded-md"></div>
                      <div className="h-3 w-3/4 bg-[#e5e2e1] rounded-md"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-md border border-[#e5e2e1] p-8 text-center">
                <Package className="w-16 h-16 text-[#8f6f6d]/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#32201f] mb-2">
                  {searchQuery ? 'Tidak Ada Hasil' : activeFilter === 'all' ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan'}
                </h3>
                <p className="text-sm text-[#8f6f6d] mb-6">
                  {searchQuery
                    ? `Tidak ada pesanan yang cocok dengan "${search}".`
                    : activeFilter === 'all'
                      ? 'Anda belum memiliki pesanan. Mulai pesan jasa sekarang!'
                      : 'Tidak ada pesanan dengan status ini.'}
                </p>
                {activeFilter === 'all' && !searchQuery && (
                  <Button onClick={() => router.push('/')} className="rounded-md">
                    Cari Jasa
                  </Button>
                )}
              </div>
            ) : (
              filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-md border border-[#e5e2e1] overflow-hidden">
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
                        {order.items?.slice(0, 2).map(item => {
                          const thumb = item.photo_url || item.service_photo_url;
                          return (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 shrink-0 bg-[#f7f5f4] rounded-md overflow-hidden relative flex items-center justify-center">
                                {thumb ? (
                                  <Image
                                    src={thumb}
                                    alt={item.service_name || item.name || 'Layanan'}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-[#8f6f6d]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#32201f] truncate">{item.service_name || item.name}</p>
                                <p className="text-xs text-[#8f6f6d]">x{item.quantity}</p>
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-[#32201f] self-end sm:self-auto">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                          );
                        })}
                        {order.items && order.items.length > 2 && (
                          <p className="text-xs text-[#8f6f6d] pl-10">
                            +{order.items.length - 2} layanan lainnya
                          </p>
                        )}
                      </div>

                      {/* Partner Info — API mengembalikan `partner.name` ter-nest; fallback ke root untuk klien lama. */}
                      {(() => {
                        const partnerName = order.partner?.name || order.partner_name;
                        if (!partnerName) return null;
                        return (
                          <div className="flex items-center gap-3 p-3 bg-[#f7f5f4] rounded-md mb-4">
                            <div className="w-10 h-10 shrink-0 bg-[#e5e2e1] rounded-md flex items-center justify-center text-sm font-bold text-[#5b403e]">
                              {getInitial(partnerName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#32201f] truncate">{partnerName}</p>
                              <p className="text-xs text-[#8f6f6d]">Mitra</p>
                            </div>
                          </div>
                        );
                      })()}

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
                              <Button size="sm" className="w-full bg-[#DD6B20] hover:bg-[#C05621] rounded-md">
                                Bayar
                              </Button>
                            </Link>
                          )}
                          {order.status === 'COMPLETED' && (
                            <Link href={`/orders/${order.id}/review`} className="flex-1 sm:flex-none">
                              <Button size="sm" variant="secondary" className="w-full border-[#e5e2e1] text-[#5b403e] rounded-md">
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Ulasan
                              </Button>
                            </Link>
                          )}
                          {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="flex-1 sm:flex-none border-[#e5e2e1] text-[#5b403e] rounded-md"
                              disabled={reorderingId === order.id}
                              onClick={() => handleReorder(order.id)}
                            >
                              {reorderingId === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <><RotateCcw className="w-4 h-4 mr-1" /> Pesan Lagi</>
                              )}
                            </Button>
                          )}
                          <Link href={`/orders/${order.id}`} className="flex-1 sm:flex-none">
                            <Button size="sm" className="w-full bg-[#b51822] hover:bg-[#90121a] rounded-md">
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
