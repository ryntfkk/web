"use client";

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Calendar, MapPin, ChevronRight, MessageSquare, Loader2, Search, RotateCcw, Store, CheckCircle2, Check, Clock, AlertCircle } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
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
  variation_id?: string;
  variation_name?: string;
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
          variation_id: i.variation_id,
          variation_name: i.variation_name,
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
      // Nama mitra ter-nest di `partner` (partner_name di root tak terisi).
      const inPartner = (order.partner?.name ?? order.partner_name)
        ?.toLowerCase()
        .includes(searchQuery);
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
      <MobilePageHeader title="Riwayat Pesanan" backHref="/profile" maxWidthClass="max-w-6xl" />

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
              <div className="bg-white rounded-xl border border-[#e5e2e1] p-10 text-center flex flex-col items-center justify-center min-h-[300px] shadow-sm">
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 bg-[#fdf2f2] rounded-full opacity-60 animate-pulse"></div>
                  <div className="absolute inset-4 bg-[#fce5e5] rounded-full"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {searchQuery ? (
                      <Search className="w-12 h-12 text-[#b51822]" strokeWidth={1.5} />
                    ) : activeFilter === 'all' ? (
                      <Package className="w-12 h-12 text-[#b51822]" strokeWidth={1.5} />
                    ) : activeFilter === 'cancelled' ? (
                      <AlertCircle className="w-12 h-12 text-[#b51822]" strokeWidth={1.5} />
                    ) : (
                      <Clock className="w-12 h-12 text-[#b51822]" strokeWidth={1.5} />
                    )}
                  </div>
                  {/* Decorative dots */}
                  <div className="absolute top-2 right-4 w-3 h-3 bg-[#D69E2E] rounded-full opacity-70"></div>
                  <div className="absolute bottom-4 left-2 w-2 h-2 bg-[#3182CE] rounded-full opacity-70"></div>
                </div>
                
                <h3 className="text-xl font-bold text-[#1c1b1b] mb-2">
                  {searchQuery ? 'Pesanan Tidak Ditemukan' : activeFilter === 'all' ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan'}
                </h3>
                <p className="text-[#5b403e] mb-8 max-w-sm text-sm">
                  {searchQuery
                    ? `Maaf, kami tidak menemukan pesanan yang cocok dengan "${search}".`
                    : activeFilter === 'all'
                      ? 'Tampaknya Anda belum pernah memesan jasa. Yuk, temukan layanan yang Anda butuhkan sekarang!'
                      : 'Belum ada riwayat pesanan untuk status ini.'}
                </p>
                {activeFilter === 'all' && !searchQuery && (
                  <Button onClick={() => router.push('/')} className="rounded-xl px-8 py-6 font-bold shadow-[0_4px_12px_rgba(181,24,34,0.2)]">
                    Mulai Cari Jasa
                  </Button>
                )}
              </div>
            ) : (
              filteredOrders.map(order => {
                const partnerName = order.partner?.name || order.partner_name;
                const extraItems = (order.items?.length ?? 0) - 2;
                return (
                  <div key={order.id} className="bg-white rounded-lg border border-[#e5e2e1] overflow-hidden transition-shadow hover:shadow-sm">
                    {/* Badan kartu bisa diklik → detail (gaya Shopee) */}
                    <Link href={`/orders/${order.id}`} className="block">
                      {/* Header: mitra (toko) + status */}
                      <div className="flex flex-col gap-3 px-4 py-3 border-b border-[#f0eded] bg-[#fcfafa]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Store className="w-4 h-4 text-[#b51822] shrink-0" />
                            <span className="text-sm font-semibold text-[#1c1b1b] truncate">{partnerName || 'Mitra'}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#c9bcba] shrink-0" />
                          </div>
                          <span className="text-xs font-bold text-[#1c1b1b]">{order.order_number}</span>
                        </div>
                        
                        {/* Visual Progress Stepper */}
                        {(() => {
                          const s = order.status;
                          if (s === 'CANCELLED') return <div className="text-xs font-bold text-[#E53E3E] flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> Dibatalkan</div>;
                          if (s === 'COMPLETED') return <div className="text-xs font-bold text-[#38A169] flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Selesai</div>;
                          
                          // Active Stepper Logic
                          const step1Active = true; // Always active if not cancelled
                          const step2Active = ['PAID', 'IN_PROGRESS', 'WAITING_ADDITIONAL_PAY', 'WAITING_CUSTOMER_CONFIRM'].includes(s);
                          const step3Active = false; // Because it's not COMPLETED if we reach here
                          
                          return (
                            <div className="flex items-center w-full max-w-sm mt-1">
                              {/* Step 1: Menunggu */}
                              <div className="flex flex-col items-center flex-1 relative">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 text-[10px] font-bold ${step1Active ? 'bg-[#b51822] text-white' : 'bg-[#e5e2e1] text-[#8f6f6d]'}`}>1</div>
                                <span className={`text-[10px] mt-1 font-medium ${step1Active ? 'text-[#b51822]' : 'text-[#8f6f6d]'}`}>Menunggu</span>
                                <div className={`absolute top-2.5 left-1/2 w-full h-[2px] -z-0 ${step2Active ? 'bg-[#b51822]' : 'bg-[#e5e2e1]'}`}></div>
                              </div>
                              {/* Step 2: Diproses */}
                              <div className="flex flex-col items-center flex-1 relative">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 text-[10px] font-bold ${step2Active ? 'bg-[#b51822] text-white' : 'bg-[#e5e2e1] text-[#8f6f6d]'}`}>2</div>
                                <span className={`text-[10px] mt-1 font-medium ${step2Active ? 'text-[#b51822]' : 'text-[#8f6f6d]'}`}>Diproses</span>
                                <div className="absolute top-2.5 left-1/2 w-full h-[2px] -z-0 bg-[#e5e2e1]"></div>
                              </div>
                              {/* Step 3: Selesai */}
                              <div className="flex flex-col items-center flex-1">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center z-10 text-[10px] font-bold bg-[#e5e2e1] text-[#8f6f6d]">3</div>
                                <span className="text-[10px] mt-1 font-medium text-[#8f6f6d]">Selesai</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Layanan — baris produk ala Shopee (thumbnail besar) */}
                      <div className="px-4 py-3 divide-y divide-[#f0eded]">
                        {order.items?.slice(0, 2).map(item => {
                          const thumb = item.photo_url || item.service_photo_url;
                          return (
                            <div key={item.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                              <div className="w-16 h-16 shrink-0 bg-[#f7f5f4] rounded-md border border-[#e5e2e1] overflow-hidden relative flex items-center justify-center">
                                {thumb ? (
                                  <Image src={thumb} alt={item.service_name || item.name || 'Layanan'} fill className="object-cover" sizes="64px" />
                                ) : (
                                  <Package className="w-5 h-5 text-[#8f6f6d]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#1c1b1b] leading-snug line-clamp-2">{item.service_name || item.name}</p>
                                <p className="text-xs text-[#8f6f6d] mt-1">x{item.quantity}</p>
                              </div>
                              <p className="text-sm font-medium text-[#1c1b1b] shrink-0 text-right">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                            </div>
                          );
                        })}
                        {extraItems > 0 && (
                          <p className="pt-2.5 text-center text-xs text-[#8f6f6d]">Lihat {extraItems} layanan lainnya</p>
                        )}
                      </div>

                      {/* Jadwal + alamat (ringkas) */}
                      {(order.service_date || order.scheduled_at || order.service_address || order.address) && (
                        <div className="px-4 pb-2.5 space-y-1">
                          {(order.service_date || order.scheduled_at) && (
                            <p className="flex items-center gap-1.5 text-xs text-[#8f6f6d]">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Jadwal: {formatDate(order.service_date || order.scheduled_at || '')}</span>
                            </p>
                          )}
                          {(order.service_address || order.address) && (
                            <p className="flex items-center gap-1.5 text-xs text-[#8f6f6d]">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{order.service_address || order.address}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Tanggal dibuat (tetap ditampilkan) */}
                      <div className="px-4 pb-2 flex items-center justify-end gap-2 text-[11px] text-[#9e8e8c]">
                        <span className="shrink-0 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{formatDate(order.created_at)}
                        </span>
                      </div>

                      {/* Total — rata kanan ala Shopee */}
                      <div className="px-4 py-2.5 bg-[#fcfafa] border-t border-[#f0eded] flex items-center justify-end gap-1.5">
                        <span className="text-xs text-[#5b403e]">Total Pesanan:</span>
                        <span className="text-base font-bold text-[#b51822]">
                          {formatPrice(order.total_amount || order.agreed_price || 0)}
                        </span>
                      </div>
                    </Link>

                    {/* Aksi — di luar Link agar tombol tak memicu navigasi */}
                    <div className="px-4 py-2.5 border-t border-[#f0eded] flex items-center justify-end gap-2 flex-wrap">
                      {order.status === 'WAITING_PAYMENT' && (
                        <Link href={`/payment/${order.id}`}>
                          <Button size="sm" className="bg-[#DD6B20] hover:bg-[#C05621] rounded-md">Bayar</Button>
                        </Link>
                      )}
                      {order.status === 'COMPLETED' && (
                        <Link href={`/orders/${order.id}/review`}>
                          <Button size="sm" variant="secondary" className="border-[#e5e2e1] text-[#5b403e] rounded-md">
                            <MessageSquare className="w-4 h-4 mr-1" /> Ulasan
                          </Button>
                        </Link>
                      )}
                      {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="border-[#e5e2e1] text-[#5b403e] rounded-md"
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
                      <Link href={`/orders/${order.id}`}>
                        <Button size="sm" className="bg-[#b51822] hover:bg-[#90121a] rounded-md">
                          Detail <ChevronRight className="w-4 h-4 ml-1 shrink-0" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
