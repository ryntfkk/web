"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bell, Settings, LayoutDashboard, Wrench, Wallet, Calendar, 
  ChevronRight, Star, TrendingUp, Package, Power, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


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
    scheduled_at: string;
  }[];
}

export default function MitraDashboardPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
  }, [isAuthenticated, user?.active_role]);

  const fetchData = async () => {
    setLoading(true);
    const [res, unreadRes] = await Promise.all([
      fetchAPI<any>('/partners/me/dashboard'),
      fetchAPI<any>('/notifications/unread-count')
    ]);
    if (res.success && res.data) {
      // Backend mengirim `is_online` (boolean), bukan `status`.
      // Turunkan status ACTIVE/INACTIVE agar indikator tidak selalu "Tutup Sementara".
      setData({ ...res.data, status: res.data.is_online ? 'ACTIVE' : 'INACTIVE' });
    }
    if (unreadRes.success && unreadRes.data) {
      setUnreadCount(unreadRes.data.unread_count || 0);
    }
    setLoading(false);
  };

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
    } else {
      setToast('Gagal mengubah status toko. Coba lagi.');
      setTimeout(() => setToast(null), 3000);
    }
    setTogglingStatus(false);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const formatTime = (t: string) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg bg-[#E53E3E]">
          {toast}
        </div>
      )}

      {/* Header — z-10 di bawah konten (z-20) agar card overlap tampil di atas background merah */}
      <div className="bg-[#b51822] text-white px-4 pt-4 pb-12 rounded-b-[2rem] shadow-sm relative z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white text-[#b51822] flex items-center justify-center font-bold overflow-hidden shrink-0">
                {user?.avatar_url ? <img src={user?.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : user?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-white/80">Halo Mitra,</p>
                <h1 className="text-sm font-bold truncate pr-4">{user?.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/notifications')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors relative">
                <Bell className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#D69E2E] rounded-full border border-[#b51822]" />
                )}
              </button>
              <button onClick={() => router.push('/mitra/profile')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <Settings className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 text-[#1c1b1b] flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold text-[#5b403e] mb-1">Status Toko</p>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${data?.status === 'ACTIVE' ? 'bg-[#38A169]' : 'bg-[#E53E3E]'}`} />
                <span className="font-bold">{data?.status === 'ACTIVE' ? 'Aktif Menerima Pesanan' : 'Tutup Sementara'}</span>
              </div>
            </div>
            <button
              onClick={toggleStatus}
              disabled={togglingStatus || loading}
              className={`p-2.5 rounded-full transition-colors ${data?.status === 'ACTIVE' ? 'bg-[#FFF5F5] text-[#E53E3E] hover:bg-[#FEB2B2]' : 'bg-[#F0FFF4] text-[#38A169] hover:bg-[#9AE6B4]'}`}
            >
              <Power className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 relative z-20 space-y-4">
        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 h-20" />
            <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 h-20" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-md border border-[#e5e2e1] p-4 flex flex-col justify-center">
              <p className="text-xs text-[#5b403e] flex items-center gap-1 mb-1"><Package className="w-3.5 h-3.5" /> Pesanan Hari Ini</p>
              <p className="text-xl font-bold text-[#1c1b1b]">{data?.stats.today_orders || 0}</p>
            </div>
            <div className="bg-white rounded-md border border-[#e5e2e1] p-4 flex flex-col justify-center">
              <p className="text-xs text-[#5b403e] flex items-center gap-1 mb-1"><TrendingUp className="w-3.5 h-3.5" /> Pendapatan Hari Ini</p>
              <p className="text-lg font-bold text-[#38A169]">{formatPrice(data?.stats.today_income || 0)}</p>
            </div>
            <div className="bg-white rounded-md border border-[#e5e2e1] p-4 col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-[#FFFAF0] flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#D69E2E] fill-[#D69E2E]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1c1b1b]">Rating {data?.stats.rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-[#5b403e]">{data?.stats.total_reviews || 0} Ulasan</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Menu */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/mitra/services" className="bg-white rounded-md border border-[#e5e2e1] p-3 flex flex-col items-center justify-center gap-2 hover:bg-[#f7f5f4] transition-colors">
            <Wrench className="w-6 h-6 text-[#b51822]" />
            <span className="text-[10px] font-bold text-[#5b403e] text-center">Kelola Layanan</span>
          </Link>
          <Link href="/mitra/schedule" className="bg-white rounded-md border border-[#e5e2e1] p-3 flex flex-col items-center justify-center gap-2 hover:bg-[#f7f5f4] transition-colors">
            <Calendar className="w-6 h-6 text-[#b51822]" />
            <span className="text-[10px] font-bold text-[#5b403e] text-center">Atur Jadwal</span>
          </Link>
          <Link href="/mitra/wallet" className="bg-white rounded-md border border-[#e5e2e1] p-3 flex flex-col items-center justify-center gap-2 hover:bg-[#f7f5f4] transition-colors">
            <Wallet className="w-6 h-6 text-[#b51822]" />
            <span className="text-[10px] font-bold text-[#5b403e] text-center">Dompet</span>
          </Link>
        </div>

        {/* Jadwal Kalender Widget */}
        <div className="bg-white rounded-md border border-[#e5e2e1] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1c1b1b]">Jadwal Mendatang</h3>
            <Calendar className="w-5 h-5 text-[#b51822]" />
          </div>
          
          <div className="space-y-3">
            {loading ? (
              <div className="h-16 bg-[#e5e2e1] rounded-md animate-pulse" />
            ) : data?.active_orders?.filter(o => o.status === 'PAID').length === 0 ? (
              <div className="text-center py-4 bg-[#f7f5f4] rounded border border-[#e5e2e1]">
                <p className="text-sm text-[#5b403e]">Tidak ada jadwal pesanan terkonfirmasi.</p>
              </div>
            ) : (
              data?.active_orders?.filter(o => o.status === 'PAID')
                .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                .slice(0, 3)
                .map(order => {
                  const date = new Date(order.scheduled_at);
                  const isToday = new Date().toDateString() === date.toDateString();
                  return (
                    <Link key={order.id} href={`/mitra/orders/${order.id}`} className="flex items-center gap-3 p-3 border border-[#e5e2e1] rounded hover:border-[#b51822] transition-colors">
                      <div className={`w-12 h-12 rounded flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-[#b51822] text-white' : 'bg-[#f7f5f4] text-[#1c1b1b]'}`}>
                        <span className="text-xs font-semibold">{date.toLocaleDateString('id-ID', { month: 'short' })}</span>
                        <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1c1b1b] truncate">{order.customer_name}</p>
                        <p className="text-xs text-[#5b403e] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {formatTime(order.scheduled_at)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#9e8e8c]" />
                    </Link>
                  );
                })
            )}
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white rounded-md border border-[#e5e2e1] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1c1b1b]">Pesanan Aktif</h3>
            <Link href="/mitra/orders" className="text-xs font-semibold text-[#b51822] hover:underline">Lihat Semua</Link>
          </div>
          
          <div className="space-y-3">
            {loading ? (
              <div className="h-20 bg-[#e5e2e1] rounded-md animate-pulse" />
            ) : data?.active_orders?.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-[#5b403e]">Belum ada pesanan aktif saat ini.</p>
              </div>
            ) : (
              data?.active_orders?.map(order => (
                <Link key={order.id} href={`/mitra/orders/${order.id}`} className="block border border-[#e5e2e1] rounded-md p-3 hover:border-[#b51822] transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-[#1c1b1b]">{order.customer_name}</p>
                    <StatusBadge status={order.status} size="sm" />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-[#5b403e] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#9e8e8c]" /> {formatTime(order.scheduled_at)}
                    </p>
                    <p className="font-bold text-[#b51822]">{formatPrice(order.total_amount)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

