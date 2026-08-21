"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Package, Search, SlidersHorizontal, X } from 'lucide-react';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { usePartnerOrders, usePartnerOrderCounts, type PartnerOrderFilters } from '@/hooks/useOrders';
import { PageSkeleton } from '@/components/ui/skeleton';
import DataState from '@/components/mitra/DataState';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  // Pendapatan bersih mitra (setelah komisi platform). Ini yang ditampilkan
  // sebagai penghasilan . bukan total_amount (bruto yang dibayar pelanggan).
  partner_amount?: number;
  partner_amount_estimated?: boolean;
  scheduled_at: string;
  // Backend mengirim nama pelanggan di dalam customer_info, bukan customer_name.
  customer_info?: { id?: string; name?: string; phone?: string };
  customer_name?: string; // fallback bila API lama
  // Ringkasan layanan yang dipesan. `/orders?role=partner` mengirim OrderDetailDTO
  // lengkap (list.go memanggil GetOrderDetail per baris), jadi `items` selalu ada
  // di respons . kartu mitra dulu tak menampilkannya, padahal riwayat pesanan
  // pelanggan menampilkan preview produk (konsistensi UI).
  items?: { id: string; service_name: string; quantity: number; price: number; photo_url?: string }[];
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled';

interface ServiceOption {
  id: string;
  name: string;
}

/**
 * Filter tambahan yang dikirim ke SERVER (P2). Rentang tanggalnya menyaring
 * `scheduled_at` . tanggal PEKERJAAN, bukan tanggal pesanan dibuat. Itulah
 * tanggal yang dimaksud mitra saat bertanya "pesanan minggu lalu apa saja".
 */
interface ExtraFilters {
  startDate: string;
  endDate: string;
  serviceId: string;
}

const EMPTY_FILTERS: ExtraFilters = { startDate: '', endDate: '', serviceId: '' };

// Pemetaan status→kelompok kini hidup di BACKEND (internal/order/list.go) dan
// dikirim lewat `status_group` (P1-01). Salinan lokalnya dihapus: dua definisi
// untuk aturan yang sama pasti menyimpang, dan yang di klien hanya bisa
// menghitung baris yang kebetulan sedang termuat.

// Ambil nama pelanggan apa pun bentuk payload-nya.
function customerName(o: Order): string {
  return o.customer_info?.name || o.customer_name || 'Pelanggan';
}

// Datar-kan halaman infinite-query sambil membuang id ganda. Paginasi OFFSET di
// bawah update realtime rapuh: bila order baru masuk saat React Query me-refetch
// halaman satu per satu, batas halaman bergeser sehingga satu id bisa muncul di
// dua halaman → duplicate React `key` (list pakai key={order.id}). Dedupe di sini
// (kemunculan PERTAMA menang; halaman 1 = terbaru & paling mutakhir) menjaga key
// unik tanpa perlu keyset-pagination di backend (berlebihan untuk volume MVP).
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

export default function MitraOrdersPage() {
  const { isLoading: authLoading, isAuthorized, isAuthenticated } = useRequireAuth();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [filters, setFilters] = useState<ExtraFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);

  // Pesanan mitra via React Query infinite (key ['orders','partner', filters]).
  // Di-invalidate realtime oleh ChatProvider saat event WS 'order_status' masuk →
  // order baru & perubahan status muncul tanpa reload (menggantikan polling 45s).
  const partnerFilters: PartnerOrderFilters = {
    statusGroup: activeFilter,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    serviceId: filters.serviceId || undefined,
  };
  const {
    data,
    isLoading: loading,
    isError,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePartnerOrders<Order>(partnerFilters);
  const orders = dedupeById(data?.pages.flatMap((p) => p.items) ?? []);
  const total = data?.pages[data.pages.length - 1]?.total ?? 0;
  const error = isError ? ((queryError as Error)?.message || 'Gagal memuat pesanan') : null;

  // Badge tab: hitungan server atas SELURUH pesanan (bukan hanya yang termuat).
  // Key ['orders','partner','counts'] ikut ter-invalidate realtime bersama daftar.
  const { data: countsData } = usePartnerOrderCounts();

  // Daftar layanan untuk dropdown filter. Diambil sekali; kegagalannya tidak
  // ditampilkan sebagai error halaman . filter layanan cuma tak tersedia,
  // sedangkan daftar pesanannya sendiri tetap berguna.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAPI<ServiceOption[]>('/partners/me/services').then((res) => {
      if (res.success) setServices(res.data ?? []);
    });
  }, [isAuthenticated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  const formatTime = (t: string) => t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

  // Status difilter SERVER; di sini tinggal pencarian teks atas baris yang
  // sudah termuat. Pencarian lintas seluruh riwayat butuh dukungan backend
  // tersendiri . jangan berpura-pura sudah punya.
  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    return q === '' ||
      o.order_number.toLowerCase().includes(q) ||
      customerName(o).toLowerCase().includes(q);
  });

  const hasExtraFilters = Boolean(filters.startDate || filters.endDate || filters.serviceId);
  const activeExtraCount = [filters.startDate || filters.endDate, filters.serviceId].filter(Boolean).length;
  const filterCounts = {
    all: countsData?.total ?? 0,
    pending: countsData?.pending ?? 0,
    processing: countsData?.processing ?? 0,
    completed: countsData?.completed ?? 0,
    cancelled: countsData?.cancelled ?? 0,
  };
  const hasMore = !!hasNextPage;

  // Badge tab dihitung dari SELURUH pesanan tanpa memandang filter tanggal/
  // layanan (endpoint ringkasan memang begitu). Menampilkannya berdampingan
  // dengan daftar yang sudah tersaring akan berbohong . jadi saat filter
  // tambahan aktif, angkanya disembunyikan alih-alih dipoles.
  const showCounts = !hasExtraFilters;

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
    <div className="pb-6">
      {/* Header standar, bukan bilah tulis tangan . tombol kembali & remah roti
          jadi konsisten dengan halaman mitra lain. Toolbar pencarian/filter
          turun jadi kartu tersendiri: sebagai pita putih selebar layar ia tidak
          punya batas sama sekali di desktop. */}
      <MitraPageHeader
        title="Daftar Pesanan"
        variant="list"
        backHref="/mitra/dashboard"
        breadcrumbs={[{ label: 'Dashboard', href: '/mitra/dashboard' }, { label: 'Pesanan' }]}
      />

      <MitraPageContainer variant="list" className="py-3 sm:py-4 space-y-3 sm:space-y-4">
        <div className="rounded-lg border border-brand-gray-100 bg-white">
          <div className="p-2.5 sm:p-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-brand-gray-450 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pesanan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-brand-gray-60 border border-brand-gray-100 rounded-md py-2 sm:py-2.5 pl-9 pr-3 text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
              />
            </div>
            <button
              type="button"
              aria-expanded={showFilters}
              aria-controls="order-extra-filters"
              onClick={() => setShowFilters(v => !v)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors ${hasExtraFilters
                  ? 'border-brand-red bg-brand-error-soft text-brand-red'
                  : 'border-brand-gray-100 bg-white text-brand-gray-700'
                }`}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden />
              Filter
              {activeExtraCount > 0 && (
                <span className="rounded-full bg-brand-red px-1.5 text-[11px] text-white">{activeExtraCount}</span>
              )}
            </button>
          </div>

          {showFilters && (
            <div id="order-extra-filters" className="border-t border-brand-gray-100 p-2.5 sm:p-3">
              <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-brand-gray-700">Jadwal dari</span>
                  <input
                    type="date"
                    value={filters.startDate}
                    max={filters.endDate || undefined}
                    onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full rounded-md border border-brand-gray-100 bg-white px-2.5 py-2 text-sm text-brand-gray-900 focus:border-brand-red focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-brand-gray-700">Jadwal sampai</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    min={filters.startDate || undefined}
                    onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full rounded-md border border-brand-gray-100 bg-white px-2.5 py-2 text-sm text-brand-gray-900 focus:border-brand-red focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-brand-gray-700">Layanan</span>
                  <select
                    value={filters.serviceId}
                    onChange={e => setFilters(f => ({ ...f, serviceId: e.target.value }))}
                    className="w-full rounded-md border border-brand-gray-100 bg-white px-2.5 py-2 text-sm text-brand-gray-900 focus:border-brand-red focus:outline-none"
                  >
                    <option value="">Semua layanan</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              {hasExtraFilters && (
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-red hover:underline"
                >
                  <X className="h-3 w-3" aria-hidden /> Hapus filter
                </button>
              )}
            </div>
          )}

          <div className="flex gap-1.5 sm:gap-2 p-2.5 sm:p-3 overflow-x-auto scrollbar-hide border-t border-brand-gray-100">
            {FILTERS.map(f => (
              <button
                key={f.key}
                type="button"
                aria-pressed={activeFilter === f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold transition-colors border ${activeFilter === f.key ? 'bg-brand-red text-white border-brand-red' : 'bg-white text-brand-gray-700 border-brand-gray-100'}`}
              >
                {f.label}
                {showCounts && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${activeFilter === f.key ? 'bg-white/25 text-white' : 'bg-brand-gray-100 text-brand-gray-700'}`}>
                    {filterCounts[f.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

      {/* Gagal memuat dibedakan dari "belum ada pesanan" (P1-11): menyamakan
          keduanya membuat mitra mengira pesanannya hilang.
          Lebar halaman TIDAK dioper lewat `className` DataState . di cabang
          error/empty kelas itu dulu menempel ke kartunya, jadi keadaan kosong
          punya lebar & padding berbeda dari daftar yang terisi. */}
      <DataState
        isLoading={loading}
        error={error}
        onRetry={() => { void refetch(); }}
        isEmpty={filteredOrders.length === 0}
        emptyIcon={<Package className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />}
        emptyTitle={
          hasExtraFilters || activeFilter !== 'all'
            ? 'Tidak ada pesanan yang cocok dengan filter ini.'
            : 'Belum ada pesanan.'
        }
        emptyAction={
          hasExtraFilters ? (
            <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>Hapus filter</Button>
          ) : undefined
        }
        skeleton={
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg border border-brand-gray-100 p-3 h-24 animate-pulse" />
            ))}
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map(order => (
            <Link key={order.id} href={`/mitra/orders/${order.id}`} className="block bg-white border border-brand-gray-100 rounded-lg p-3 hover:border-brand-red transition-colors">
              <div className="flex justify-between items-start mb-2.5">
                <div>
                  <p className="text-xs text-brand-gray-450 font-medium mb-0.5">No. {order.order_number}</p>
                  <p className="font-bold text-brand-gray-900">{customerName(order)}</p>
                </div>
                <StatusBadge status={order.status} size="sm" />
              </div>

              {/* Preview layanan dipesan . `items` sudah dikirim penuh oleh
                  /orders?role=partner; kartu mitra dulu tak menampilkannya
                  padahal riwayat pesanan pelanggan menampilkannya. */}
              {order.items && order.items.length > 0 && (
                <div className="flex items-center gap-2.5 border-t border-brand-gray-100 pt-2.5 mb-2.5">
                  <div className="relative w-11 h-11 shrink-0 rounded-md bg-brand-gray-60 border border-brand-gray-100 overflow-hidden flex items-center justify-center">
                    {order.items[0].photo_url ? (
                      <Image src={order.items[0].photo_url} alt={order.items[0].service_name || 'Layanan'} fill sizes="44px" className="object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-brand-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-brand-gray-900 leading-snug line-clamp-1">
                      {order.items[0].service_name}
                    </p>
                    <p className="text-xs text-brand-gray-450 mt-0.5">
                      {order.items[0].quantity}x
                      {order.items.length > 1 && ` · +${order.items.length - 1} layanan lain`}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-end border-t border-brand-gray-100 pt-2.5">
                <div className="flex items-center gap-1.5 text-sm text-brand-gray-700">
                  <Calendar className="w-4 h-4 text-brand-gray-450" />
                  <span>{formatTime(order.scheduled_at)}</span>
                </div>
                {/* Pesanan batal TIDAK menghasilkan apa pun bagi mitra
                    (utils.CalculateRefund: kompensasi mitra 0). Backend tetap
                    mengirim `partner_amount` hasil ESTIMASI karena kolomnya di
                    DB hanya terisi saat pesanan selesai . mencetaknya apa adanya
                    membuat tab "Dibatalkan" berisi deretan rupiah yang tidak
                    pernah datang. */}
                <div className="text-right">
                  {order.status === 'CANCELLED' ? (
                    <>
                      <p className="font-bold text-brand-gray-450">{formatPrice(0)}</p>
                      <p className="text-[11px] text-brand-gray-450 mt-0.5">Pesanan dibatalkan</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-brand-red">
                        {formatPrice(order.partner_amount ?? 0)}
                        {order.partner_amount_estimated && (
                          <span className="ml-1 text-[11px] font-normal text-brand-gray-450">est.</span>
                        )}
                      </p>
                      <p className="text-[11px] text-brand-gray-450 mt-0.5">Pendapatan mitra</p>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {hasMore && (
          <div className="pt-4 text-center">
            <Button
              variant="outline"
              className="w-full"
              isLoading={isFetchingNextPage}
              onClick={() => { void fetchNextPage(); }}
            >
              Muat lebih banyak
            </Button>
            <p className="mt-2 text-xs text-brand-gray-450">
              Menampilkan {orders.length} dari {total} pesanan
            </p>
          </div>
        )}
      </DataState>
      </MitraPageContainer>
    </div>
  );
}
