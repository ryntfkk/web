"use client";

import { getInitial } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell, Settings, LayoutDashboard, Wrench, Wallet, Calendar,
  ChevronRight, Star, TrendingUp, Package, Power, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { fetchAPI } from '@/lib/api';
import { track } from '@/lib/analytics';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { useToast } from '@/components/ui/toast';
import { PageSkeleton } from '@/components/ui/skeleton';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import EmailVerificationNotice from '@/components/mitra/EmailVerificationNotice';
import Image from 'next/image';


interface DashboardData {
  status: 'ACTIVE' | 'INACTIVE';
  stats: {
    today_orders: number;
    today_income: number;
    rating: number;
    total_reviews: number;
  };
  active_orders: {
    id: string;
    order_number: string;
    customer_name: string;
    status: OrderStatus;
    total_amount: number;
    // Pendapatan bersih mitra (setelah komisi platform) . tampilkan ini, bukan
    // total_amount (bruto yang dibayar pelanggan).
    partner_amount?: number;
    partner_amount_estimated?: boolean;
    scheduled_at: string;
  }[];
}

export default function MitraDashboardPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  // Satu sumber dengan lonceng TopNavbar . dulu dashboard ini menembak
  // `/notifications/unread-count` sendiri di dalam fetchData, sementara sisi
  // pelanggan tidak memakainya sama sekali (audit A3).
  const unreadCount = useUnreadNotifications();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
  }, [isAuthenticated, user?.active_role]);

  // K1-interim: polling senyap tiap 45s agar order baru & badge notif muncul
  // tanpa reload manual (mitra tak punya push/WS real-time saat ini). Hanya saat
  // tab terlihat . hemat request. Tanpa spinner (silent) agar tak berkedip.
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 45000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await fetchAPI<any>('/partners/me/dashboard');
    if (res.success && res.data) {
      // Backend mengirim `status` ('ACTIVE'/'INACTIVE'). Fallback ke `is_online`
      // hanya bila `status` absen, agar indikator tidak terkunci di "Tutup Sementara".
      const status = res.data.status ?? (res.data.is_online ? 'ACTIVE' : 'INACTIVE');
      // Go mengirim `null` untuk slice kosong; normalkan ke array agar
      // pengecekan `.length === 0` (empty state) tetap jalan.
      setData({ ...res.data, status, active_orders: res.data.active_orders ?? [] });
    }
    setLoading(false);
  };

  // Sekali per kunjungan, bukan tiap polling 45 detik . kalau ikut polling,
  // "dashboard viewed" berubah jadi ukuran lama tab dibiarkan terbuka dan tidak
  // lagi berarti apa pun.
  const dashboardTracked = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || dashboardTracked.current) return;
    dashboardTracked.current = true;
    track('partner_dashboard_viewed');
  }, [isAuthenticated]);

  const toggleStatus = async () => {
    if (!data) return;
    setTogglingStatus(true);
    const newStatus = data.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await fetchAPI('/partners/me/availability', {
      method: 'PATCH',
      body: JSON.stringify({ is_online: newStatus === 'ACTIVE' })
    });
    if (res.success) {
      setData({ ...data, status: newStatus });
      // Dicatat dari HASIL server, bukan dari niat klik: status yang ditolak
      // server tidak boleh terhitung sebagai perubahan yang terjadi.
      track('partner_availability_changed', { is_online: newStatus === 'ACTIVE' });
    } else {
      showToast('Gagal mengubah status toko. Coba lagi.', 'error');
    }
    setTogglingStatus(false);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const formatTime = (t: string) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const activeOrders = data?.active_orders ?? [];

  // Jadwal Mendatang = pesanan yang sudah dibayar dan menunggu dikerjakan,
  // diurutkan dari yang paling dekat.
  const upcomingOrders = activeOrders
    .filter(o => o.status === 'PAID')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 3);

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="pb-6">

      {/* Header . z-10 di bawah konten (z-20) agar card overlap tampil di atas background merah */}
      <div className="bg-brand-red text-white rounded-b-2xl shadow-sm relative z-10">
        <MitraPageContainer variant="dashboard" className="pt-4 pb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white text-brand-red flex items-center justify-center font-bold overflow-hidden shrink-0">
                {user?.avatar_url
                  ? <Image src={user.avatar_url} alt="Foto profil" width={40} height={40} className="w-full h-full object-cover" />
                  : getInitial(user?.name || '')}
              </div>
              <div>
                <p className="text-xs text-white/80">Halo Mitra,</p>
                <h1 className="text-sm font-bold truncate pr-4">{user?.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/notifications')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors relative" aria-label="Notifikasi">
                <Bell className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 bg-brand-warning rounded-full border border-brand-red" />
                )}
              </button>
              <button onClick={() => router.push('/mitra/profile')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" aria-label="Pengaturan">
                <Settings className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 text-brand-gray-900 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold text-brand-gray-700 mb-1">Status Toko</p>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${data?.status === 'ACTIVE' ? 'bg-brand-success' : 'bg-brand-error'}`} />
                <span className="font-bold">{data?.status === 'ACTIVE' ? 'Aktif Menerima Pesanan' : 'Tutup Sementara'}</span>
              </div>
            </div>
            <button
              onClick={toggleStatus}
              disabled={togglingStatus || loading}
              className={`p-2.5 rounded-full transition-colors ${data?.status === 'ACTIVE' ? 'bg-brand-error-soft text-brand-error hover:bg-brand-error-border' : 'bg-brand-success-soft text-brand-success hover:bg-brand-success-border'}`}
              aria-label="Ubah status toko"
            >
              <Power className="w-5 h-5" />
            </button>
          </div>
        </MitraPageContainer>
      </div>

      <MitraPageContainer variant="dashboard" className="py-0 -mt-6 relative z-20 space-y-4">
        {/* Diam sendiri bila email sudah terverifikasi . lihat komponennya. */}
        <EmailVerificationNotice />

        {/* Stats */}
        {loading ? (
          /* Bentuknya harus SAMA dengan grid aslinya . dua kartu placeholder
             untuk grid berisi tiga membuat isinya melompat saat data tiba. */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 animate-pulse">
            <div className="bg-white rounded-md border border-brand-gray-100 p-4 h-20" />
            <div className="bg-white rounded-md border border-brand-gray-100 p-4 h-20" />
            <div className="bg-white rounded-md border border-brand-gray-100 p-4 h-20 col-span-2" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="bg-white rounded-md border border-brand-gray-100 p-4 flex flex-col justify-center">
              <p className="text-xs text-brand-gray-700 flex items-center gap-1 mb-1"><Package className="w-3.5 h-3.5" /> Pesanan Hari Ini</p>
              <p className="text-xl font-bold text-brand-gray-900">{data?.stats.today_orders || 0}</p>
            </div>
            <div className="bg-white rounded-md border border-brand-gray-100 p-4 flex flex-col justify-center">
              <p className="text-xs text-brand-gray-700 flex items-center gap-1 mb-1"><TrendingUp className="w-3.5 h-3.5" /> Pendapatan Hari Ini</p>
              <p className="text-lg font-bold text-brand-success">{formatPrice(data?.stats.today_income || 0)}</p>
            </div>
            {/* Kartu rating jadi tautan ke halaman ulasan . di sanalah mitra
                membalas ulasan pelanggan (batas balas 7 hari). */}
            <Link
              href="/mitra/reviews"
              className="bg-white rounded-md border border-brand-gray-100 p-4 col-span-2 flex items-center justify-between hover:bg-brand-gray-60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-brand-orange-soft flex items-center justify-center">
                  <Star className="w-4 h-4 text-brand-warning fill-brand-warning" />
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-gray-900">Rating {data?.stats.rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-brand-gray-700">{data?.stats.total_reviews || 0} Ulasan · Balas ulasan</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-brand-gray-400" />
            </Link>
          </div>
        )}

        {/* Quick Menu.
            Hanya 3 item . di desktop pakai 3 kolom, bukan 6, supaya tidak
            ada separuh baris kosong yang terlihat tidak seimbang. */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <Link href="/mitra/services" className="bg-white rounded-md border border-brand-gray-100 p-3 flex flex-col items-center justify-center gap-2 hover:bg-brand-gray-60 transition-colors">
            <Wrench className="w-6 h-6 text-brand-red" />
            <span className="text-[10px] font-bold text-brand-gray-700 text-center">Kelola Layanan</span>
          </Link>
          <Link href="/mitra/schedule" className="bg-white rounded-md border border-brand-gray-100 p-3 flex flex-col items-center justify-center gap-2 hover:bg-brand-gray-60 transition-colors">
            <Calendar className="w-6 h-6 text-brand-red" />
            <span className="text-[10px] font-bold text-brand-gray-700 text-center">Atur Jadwal</span>
          </Link>
          <Link href="/mitra/wallet" className="bg-white rounded-md border border-brand-gray-100 p-3 flex flex-col items-center justify-center gap-2 hover:bg-brand-gray-60 transition-colors">
            <Wallet className="w-6 h-6 text-brand-red" />
            <span className="text-[10px] font-bold text-brand-gray-700 text-center">Dompet</span>
          </Link>
        </div>

        {/* Dua daftar berdampingan di desktop. Sebagai dua blok penuh selebar
            1280px keduanya hanya jadi baris-baris panjang dengan ruang kosong
            di tengah . ruang desktop dipakai untuk kolom, bukan diregangkan. */}
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">

        {/* Jadwal Kalender Widget */}
        <div className="bg-white rounded-md border border-brand-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-brand-gray-900">Jadwal Mendatang</h3>
            <Calendar className="w-5 h-5 text-brand-red" />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="h-16 bg-brand-gray-100 rounded-md animate-pulse" />
            ) : upcomingOrders.length === 0 ? (
              <div className="text-center py-4 bg-brand-gray-60 rounded-md border border-brand-gray-100">
                <p className="text-sm text-brand-gray-700">Tidak ada jadwal pesanan terkonfirmasi.</p>
              </div>
            ) : (
              upcomingOrders.map(order => {
                const date = new Date(order.scheduled_at);
                const isToday = new Date().toDateString() === date.toDateString();
                return (
                  <Link key={order.id} href={`/mitra/orders/${order.id}`} className="flex items-center gap-3 p-3 border border-brand-gray-100 rounded-md hover:border-brand-red transition-colors">
                    <div className={`w-12 h-12 rounded-md flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-brand-red text-white' : 'bg-brand-gray-60 text-brand-gray-900'}`}>
                      <span className="text-xs font-semibold">{date.toLocaleDateString('id-ID', { month: 'short' })}</span>
                      <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-brand-gray-900 truncate">{order.customer_name}</p>
                      <p className="text-xs text-brand-gray-700 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {formatTime(order.scheduled_at)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-brand-gray-450" />
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white rounded-md border border-brand-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-brand-gray-900">Pesanan Aktif</h3>
            <Link href="/mitra/orders" className="text-xs font-semibold text-brand-red hover:underline">Lihat Semua</Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="h-20 bg-brand-gray-100 rounded-md animate-pulse" />
            ) : activeOrders.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-brand-gray-700">Belum ada pesanan aktif saat ini.</p>
              </div>
            ) : (
              activeOrders.map(order => (
                <Link key={order.id} href={`/mitra/orders/${order.id}`} className="block border border-brand-gray-100 rounded-md p-3 hover:border-brand-red transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-brand-gray-900">{order.customer_name}</p>
                    <StatusBadge status={order.status} size="sm" />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-brand-gray-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-gray-450" /> {formatTime(order.scheduled_at)}
                    </p>
                    <p className="font-bold text-brand-red">
                      {formatPrice(order.partner_amount ?? 0)}
                      {order.partner_amount_estimated && (
                        <span className="ml-1 text-[10px] font-normal text-brand-gray-450">est.</span>
                      )}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
        </div>
      </MitraPageContainer>
    </div>
  );
}

