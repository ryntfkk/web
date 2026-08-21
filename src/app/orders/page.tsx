"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Calendar, MapPin, ChevronRight, Loader2, Search, RotateCcw, Store, Clock, AlertCircle, XCircle, Star } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { OrderCardSkeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { useCustomerOrders } from '@/hooks/useOrders';
import { FilterStatus, matchesFilter } from '@/lib/order-utils';
import { formatRupiah as formatPrice, formatDateOnly as formatDate } from '@/lib/format';
import { StatusBadge, type OrderStatus } from '@/components/ui/status-badge';
import { CountdownTimer } from '@/components/ui/countdown-timer';
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
  /** Batas bayar . dipakai hitung mundur pada kartu WAITING_PAYMENT. */
  payment_expired_at?: string;
  /**
   * Cara pembayaran (E7). Nilainya apa adanya dari gateway . di produksi
   * terlihat `bank_transfer`, `wallet_balance`, dan `snap`. Yang terakhir itu
   * PLACEHOLDER Midtrans (nama widget-nya, bukan cara bayar), jadi tidak boleh
   * ditampilkan sebagai informasi . lihat PAYMENT_METHOD_LABEL.
   */
  payment_method?: string;
  /** Alasan & pelaku pembatalan; sudah dirender halaman detail, dulu tidak di daftar. */
  cancellation_reason?: string;
  cancelled_by?: string;
}

const VALID_FILTERS: FilterStatus[] = ['all', 'pending', 'processing', 'completed', 'cancelled'];

/**
 * Cara bayar → label yang berarti bagi pelanggan (E7).
 *
 * Sengaja daftar TERTUTUP: nilai yang tak dikenal . termasuk `snap`, yang cuma
 * nama widget Midtrans . tidak ditampilkan sama sekali. Mencetak nilai mentah
 * membuat sebagian pelanggan melihat "snap" dan tidak ada yang bisa
 * menjelaskannya; lebih baik diam daripada mengisi baris dengan kata yang tak
 * bermakna.
 */
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Transfer Bank / VA',
  wallet_balance: 'Saldo Dompet',
  credit_card: 'Kartu Kredit',
  gopay: 'GoPay',
  shopeepay: 'ShopeePay',
  qris: 'QRIS',
  echannel: 'Mandiri Bill',
  permata: 'Permata VA',
  cstore: 'Gerai Retail',
};

/** Ambang munculnya kolom pencarian pesanan (sama dengan aturan >= 6 di daftar chat). */
const SEARCH_MIN_ORDERS = 6;

// useSearchParams wajib berada di bawah <Suspense> (aturan Next App Router
// saat prerender) . karena itu isi halaman dipisah ke komponen dalam.
export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
          <div className="max-w-6xl mx-auto px-4 py-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
          </div>
        </div>
      }
    >
      <OrdersPageInner />
    </Suspense>
  );
}

function OrdersPageInner() {
  // useRequireAuth menunggu isInitializing (silent refresh) selesai sebelum
  // redirect ke /login . mencegah hard-load mental ke login saat sesi masih ada.
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Tab awal dibaca dari ?status= . kartu ringkasan di /profile menaut ke sini
  // dengan status spesifik, dan refresh/back harus mempertahankan tab aktif.
  const statusParam = searchParams.get('status');
  const urlFilter: FilterStatus = VALID_FILTERS.includes(statusParam as FilterStatus)
    ? (statusParam as FilterStatus)
    : 'all';
  // Pesanan via React Query (key ['orders','customer']) . di-invalidate realtime
  // oleh ChatProvider saat event WS 'order_status' masuk → UI menyegar tanpa reload.
  const { data: orders = [], isLoading: loading } = useCustomerOrders<Order>();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>(urlFilter);
  const [search, setSearch] = useState('');
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const { addItem } = useCartStore();
  const { showToast } = useToast();

  // Sinkron dengan tombol back/forward browser (URL berubah tanpa remount).
  useEffect(() => {
    setActiveFilter(urlFilter);
  }, [urlFilter]);

  function changeFilter(filter: FilterStatus) {
    setActiveFilter(filter);
    // URL ikut berubah agar back/refresh mempertahankan tab; replace (bukan
    // push) supaya gonta-ganti tab tidak menumpuk riwayat browser.
    router.replace(filter === 'all' ? '/orders' : `/orders?status=${filter}`, { scroll: false });
  }

  async function handleReorder(orderId: string) {
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
      const data = (res.data as ReorderResponse);
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

  if (authLoading) {
    return (
      <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">

      {/* Header khusus mobile . di desktop TopNavbar sudah jadi satu-satunya header. */}
      {/* titleAs="p": H1 halaman ada di badan konten . tanpa ini HTML memuat DUA H1 sekaligus (audit A6). */}
      <MobilePageHeader
        titleAs="p" title="Riwayat Pesanan" backHref="/profile" maxWidthClass="max-w-6xl" />

      <div className="max-w-6xl mx-auto px-4 py-6 overflow-hidden">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-6">Riwayat Pesanan</h1>
        <div className="flex flex-col lg:flex-row gap-6 max-w-full">

          <div className="w-full lg:w-64 shrink-0 min-w-0">
            <div className="bg-white rounded-lg border border-brand-gray-100 overflow-hidden">
              <div className="hidden lg:block p-4 border-b border-brand-gray-100">
                <h3 className="font-semibold text-brand-gray-900">Filter</h3>
              </div>

              <div
                className="flex flex-row overflow-x-auto lg:flex-col divide-x lg:divide-x-0 lg:divide-y divide-brand-gray-100 scrollbar-hide touch-pan-x w-full"
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
                    onClick={() => changeFilter(filter.key)}
                    className={`shrink-0 lg:w-full flex items-center justify-between p-4 hover:bg-brand-gray-60 transition-colors text-left outline-none ${activeFilter === filter.key ? 'bg-brand-red-light' : ''
                      }`}
                  >
                    <span className={`text-sm font-medium whitespace-nowrap mr-3 lg:mr-0 ${activeFilter === filter.key ? 'text-brand-red' : 'text-brand-gray-900'
                      }`}>
                      {filter.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-md shrink-0 ${activeFilter === filter.key
                      ? 'bg-brand-red text-white'
                      : 'bg-brand-gray-100 text-brand-gray-700'
                      }`}>
                      {filterCounts[filter.key]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 min-w-0">


            {/* Search . baru muncul saat daftarnya cukup panjang untuk perlu
                dicari (ambang sama dengan daftar chat). Dengan dua-tiga pesanan
                kolom ini hanya memakan ruang di atas layar tanpa pernah dipakai.
                Tetap dirender selama masih ada kata kunci supaya tidak lenyap di
                tengah pengetikan begitu hasilnya menyusut. */}
            {(orders.length >= SEARCH_MIN_ORDERS || search.trim().length > 0) && (
              <div className="relative">
                <Search className="w-4 h-4 text-brand-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari no. pesanan, mitra, atau layanan…"
                  className="w-full pl-9 pr-9 py-2.5 rounded-md text-sm bg-white border border-brand-gray-100 text-brand-gray-900 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-brand-gray-450 hover:text-brand-gray-700 rounded transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <>
                {[1, 2, 3].map(i => <OrderCardSkeleton key={i} />)}
              </>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-xl border border-brand-gray-100 p-10 text-center flex flex-col items-center justify-center min-h-[300px] shadow-sm">
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 bg-brand-red-soft rounded-full opacity-60 animate-pulse"></div>
                  <div className="absolute inset-4 bg-brand-red-soft rounded-full"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {searchQuery ? (
                      <Search className="w-12 h-12 text-brand-red" strokeWidth={1.5} />
                    ) : activeFilter === 'all' ? (
                      <Package className="w-12 h-12 text-brand-red" strokeWidth={1.5} />
                    ) : activeFilter === 'cancelled' ? (
                      <AlertCircle className="w-12 h-12 text-brand-red" strokeWidth={1.5} />
                    ) : (
                      <Clock className="w-12 h-12 text-brand-red" strokeWidth={1.5} />
                    )}
                  </div>
                  {/* Decorative dots */}
                  <div className="absolute top-2 right-4 w-3 h-3 bg-brand-warning rounded-full opacity-70"></div>
                  <div className="absolute bottom-4 left-2 w-2 h-2 bg-brand-info rounded-full opacity-70"></div>
                </div>

                <h3 className="text-xl font-bold text-brand-gray-900 mb-2">
                  {searchQuery ? 'Pesanan Tidak Ditemukan' : activeFilter === 'all' ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan'}
                </h3>
                <p className="text-brand-gray-700 mb-8 max-w-sm text-sm">
                  {searchQuery
                    ? `Maaf, kami tidak menemukan pesanan yang cocok dengan "${search}".`
                    : activeFilter === 'all'
                      ? 'Tampaknya Anda belum pernah memesan layanan. Yuk, temukan layanan yang Anda butuhkan sekarang!'
                      : 'Belum ada riwayat pesanan untuk status ini.'}
                </p>
                {activeFilter === 'all' && !searchQuery && (
                  <Button onClick={() => router.push('/')} className="rounded-xl px-8 py-6 font-bold shadow-[0_4px_12px_rgba(181,24,34,0.2)]">
                    Mulai Cari Layanan
                  </Button>
                )}
              </div>
            ) : (
              filteredOrders.map(order => {
                const partnerName = order.partner?.name || order.partner_name;
                const extraItems = (order.items?.length ?? 0) - 2;
                return (
                  <div key={order.id} className="bg-white rounded-lg border border-brand-gray-100 overflow-hidden transition-shadow hover:shadow-sm">
                    {/* Badan kartu bisa diklik → detail (gaya Shopee) */}
                    <Link href={`/orders/${order.id}`} className="block">
                      {/* Header: mitra (toko) + status */}
                      <div className="flex flex-col gap-3 px-4 py-3 border-b border-brand-red-light bg-brand-gray-55">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Store className="w-4 h-4 text-brand-red shrink-0" />
                            <span className="text-sm font-semibold text-brand-gray-900 truncate">{partnerName || 'Mitra'}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-brand-gray-300 shrink-0" />
                          </div>
                          <span className="text-xs font-bold text-brand-gray-900">{order.order_number}</span>
                        </div>

                        {/*
                          Status SPESIFIK, bukan stepper 3 langkah.

                          Stepper lama menyamarkan justru yang paling penting:
                          "Menunggu Pembayaran" (butuh tindakan pelanggan
                          SEKARANG), "Menunggu Konfirmasimu" (dana cair otomatis
                          kalau didiamkan), dan "Sedang Dikerjakan" semuanya
                          tampil identik sebagai "Diproses". Ia juga cacat:
                          `step3Active` di-hardcode `false` sehingga langkah
                          "Selesai" tak pernah menyala, dan garis penghubung
                          langkah 2→3 selalu abu (audit C5).

                          `StatusBadge` sudah punya kesembilan status lengkap
                          dengan warna & ikonnya, sudah dipakai halaman detail
                          dan tab pesanan di /profile . dan di berkas ini
                          sebenarnya sudah di-import, hanya tidak pernah dipakai.
                        */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={order.status as OrderStatus} size="sm" />
                          {order.status === 'WAITING_PAYMENT' && order.payment_expired_at && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-orange-dark">
                              <Clock className="w-3 h-3" />
                              Bayar sebelum{' '}
                              <CountdownTimer
                                targetDate={order.payment_expired_at}
                                format="mm:ss"
                                criticalThresholdSeconds={300}
                                className="!text-[11px] font-bold"
                              />
                            </span>
                          )}
                        </div>

                        {/* Alasan pembatalan . sudah dirender halaman detail dari
                            objek yang sama, tapi di daftar kartu CANCELLED cuma
                            bertuliskan "Dibatalkan" tanpa sebab (audit E7). */}
                        {order.status === 'CANCELLED' && order.cancellation_reason && (
                          <p className="flex items-start gap-1.5 text-[11px] text-brand-error leading-snug">
                            <XCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>
                              {order.cancellation_reason}
                              {order.cancelled_by && (
                                <span className="text-brand-gray-450">
                                  {' '}· dibatalkan oleh {order.cancelled_by.toUpperCase() === 'PARTNER' ? 'mitra' : 'kamu'}
                                </span>
                              )}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Layanan . baris produk ala Shopee (thumbnail besar) */}
                      <div className="px-4 py-3 divide-y divide-brand-red-light">
                        {order.items?.slice(0, 2).map(item => {
                          const thumb = item.photo_url || item.service_photo_url;
                          return (
                            <div key={item.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                              <div className="w-16 h-16 shrink-0 bg-brand-gray-60 rounded-md border border-brand-gray-100 overflow-hidden relative flex items-center justify-center">
                                {thumb ? (
                                  <Image src={thumb} alt={item.service_name || item.name || 'Layanan'} fill className="object-cover" sizes="64px" />
                                ) : (
                                  <Package className="w-5 h-5 text-brand-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-brand-gray-900 leading-snug line-clamp-2">{item.service_name || item.name}</p>
                                <p className="text-xs text-brand-gray-400 mt-1">x{item.quantity}</p>
                              </div>
                              <p className="text-sm font-medium text-brand-gray-900 shrink-0 text-right">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                            </div>
                          );
                        })}
                        {extraItems > 0 && (
                          <p className="pt-2.5 text-center text-xs text-brand-gray-400">Lihat {extraItems} layanan lainnya</p>
                        )}
                      </div>

                      {/* Jadwal + alamat (ringkas) */}
                      {(order.service_date || order.scheduled_at || order.service_address || order.address) && (
                        <div className="px-4 pb-2.5 space-y-1">
                          {(order.service_date || order.scheduled_at) && (
                            <p className="flex items-center gap-1.5 text-xs text-brand-gray-400">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Jadwal: {formatDate(order.service_date || order.scheduled_at || '')}</span>
                            </p>
                          )}
                          {(order.service_address || order.address) && (
                            <p className="flex items-center gap-1.5 text-xs text-brand-gray-400">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{order.service_address || order.address}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Tanggal dibuat (tetap ditampilkan) */}
                      <div className="px-4 pb-2 flex items-center justify-end gap-2 text-[11px] text-brand-gray-450">
                        <span className="shrink-0 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{formatDate(order.created_at)}
                        </span>
                      </div>

                      {/* Total . rata kanan ala Shopee. Cara bayar ikut di baris
                          yang sama (E7): ia konteks harga, bukan baris sendiri. */}
                      <div className="px-4 py-2.5 bg-brand-gray-55 border-t border-brand-red-light flex items-center justify-end gap-1.5">
                        {order.payment_method && PAYMENT_METHOD_LABEL[order.payment_method] && (
                          <span className="mr-auto text-xs text-brand-gray-450">
                            {PAYMENT_METHOD_LABEL[order.payment_method]}
                          </span>
                        )}
                        <span className="text-xs text-brand-gray-700">Total Pesanan:</span>
                        <span className="text-base font-bold text-brand-red">
                          {formatPrice(order.total_amount || order.agreed_price || 0)}
                        </span>
                      </div>
                    </Link>

                    {/* Aksi . di luar Link agar tombol tak memicu navigasi */}
                    <div className="px-4 py-2.5 border-t border-brand-red-light flex items-center justify-end gap-2 flex-wrap">
                      {order.status === 'WAITING_PAYMENT' && (
                        <Link href={`/payment/${order.id}`}>
                          <Button size="sm" className="bg-brand-orange hover:bg-brand-orange rounded-md">Bayar Sekarang</Button>
                        </Link>
                      )}
                      {order.status === 'COMPLETED' && (
                        <Link href={`/orders/${order.id}/review`}>
                          <Button size="sm" variant="secondary" className="border-brand-gray-100 text-brand-gray-700 rounded-md">
                            <Star className="w-4 h-4 mr-1" /> Beri Ulasan
                          </Button>
                        </Link>
                      )}
                      {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="border-brand-gray-100 text-brand-gray-700 rounded-md"
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
                        <Button size="sm" className="bg-brand-red hover:bg-brand-red-dark rounded-md">
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
