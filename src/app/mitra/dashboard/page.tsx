"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bell, Settings, LayoutDashboard, Wrench, Wallet, Calendar, 
  ChevronRight, Star, TrendingUp, Package, Power
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

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
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.active_role !== 'mitra') { router.push('/'); return; }
    fetchData();
  }, [isAuthenticated, user?.active_role]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/partners/me/dashboard');
    if (res.success && res.data) {
      setData(res.data.data ?? res.data);
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
    }
    setTogglingStatus(false);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const formatTime = (t: string) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  if (!isAuthenticated || user?.active_role !== 'mitra') return null;

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-[#b51822] text-white px-4 pt-4 pb-12 rounded-b-[2rem] shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white text-[#b51822] flex items-center justify-center font-bold overflow-hidden shrink-0">
                {user.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-white/80">Halo Mitra,</p>
                <h1 className="text-sm font-bold truncate pr-4">{user.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors relative">
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#D69E2E] rounded-full border border-[#b51822]" />
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
            <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 flex flex-col justify-center">
              <p className="text-xs text-[#5b403e] flex items-center gap-1 mb-1"><Package className="w-3.5 h-3.5" /> Pesanan Hari Ini</p>
              <p className="text-xl font-bold text-[#1c1b1b]">{data?.stats.today_orders || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 flex flex-col justify-center">
              <p className="text-xs text-[#5b403e] flex items-center gap-1 mb-1"><TrendingUp className="w-3.5 h-3.5" /> Pendapatan Hari Ini</p>
              <p className="text-lg font-bold text-[#38A169]">{formatPrice(data?.stats.today_income || 0)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFFAF0] flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#D69E2E] fill-[#D69E2E]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1c1b1b]">Rating {data?.stats.rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-[#5b403e]">{data?.stats.total_reviews || 0} Ulasan</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9e8e8c]" />
            </div>
          </div>
        )}

        {/* Quick Menu */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/mitra/services" className="bg-white rounded-xl border border-[#e5e2e1] p-3 flex flex-col items-center justify-center gap-2 hover:bg-[#f7f5f4] transition-colors">
            <Wrench className="w-6 h-6 text-[#b51822]" />
            <span className="text-[10px] font-bold text-[#5b403e] text-center">Kelola Layanan</span>
          </Link>
          <Link href="/mitra/schedule" className="bg-white rounded-xl border border-[#e5e2e1] p-3 flex flex-col items-center justify-center gap-2 hover:bg-[#f7f5f4] transition-colors">
            <Calendar className="w-6 h-6 text-[#b51822]" />
            <span className="text-[10px] font-bold text-[#5b403e] text-center">Atur Jadwal</span>
          </Link>
          <Link href="/mitra/wallet" className="bg-white rounded-xl border border-[#e5e2e1] p-3 flex flex-col items-center justify-center gap-2 hover:bg-[#f7f5f4] transition-colors">
            <Wallet className="w-6 h-6 text-[#b51822]" />
            <span className="text-[10px] font-bold text-[#5b403e] text-center">Dompet</span>
          </Link>
        </div>

        {/* Active Orders */}
        <div className="bg-white rounded-xl border border-[#e5e2e1] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1c1b1b]">Pesanan Aktif</h3>
            <Link href="/mitra/orders" className="text-xs font-semibold text-[#b51822] hover:underline">Lihat Semua</Link>
          </div>
          
          <div className="space-y-3">
            {loading ? (
              <div className="h-20 bg-[#e5e2e1] rounded-xl animate-pulse" />
            ) : data?.active_orders?.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-[#5b403e]">Belum ada pesanan aktif saat ini.</p>
              </div>
            ) : (
              data?.active_orders?.map(order => (
                <Link key={order.id} href={`/mitra/orders/${order.id}`} className="block border border-[#e5e2e1] rounded-lg p-3 hover:border-[#b51822] transition-colors">
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

      {/* Bottom Navigation for Mitra */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] pb-safe z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <Link href="/mitra/dashboard" className="flex flex-col items-center justify-center w-full h-full text-[#b51822]">
            <LayoutDashboard className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Beranda</span>
          </Link>
          <Link href="/mitra/orders" className="flex flex-col items-center justify-center w-full h-full text-[#9e8e8c] hover:text-[#5b403e]">
            <Package className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold">Pesanan</span>
          </Link>
          <Link href="/mitra/profile" className="flex flex-col items-center justify-center w-full h-full text-[#9e8e8c] hover:text-[#5b403e]">
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold">Profil</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
