"use client";

import { getInitial } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { User, LogOut, FileText, Settings, ShieldCheck, MapPin, ChevronRight, Phone, Mail, Package, Calendar, Heart, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { MenuCard, MenuListItem } from '@/components/ui/menu-list-item';
import { fetchAPI } from '@/lib/api';
import { unwrapData, FilterStatus, matchesFilter } from '@/lib/order-utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SwitchRoleModal } from '@/components/ui/switch-role-modal';
import PartnerStatusCard, { type PartnerProfile } from '@/components/profile/PartnerStatusCard';


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
  service_address?: string;
  partner_name?: string;
  partner_avatar?: string;
  items: OrderItem[];
  notes?: string;
}

type ActiveTab = 'profile' | 'orders' | 'settings';

export default function ProfilePage() {
  const { logout, loading } = useAuth();
  // useRequireAuth menunggu isInitializing (silent refresh) selesai sebelum
  // redirect ke /login — mencegah hard-load mental ke login saat sesi masih ada.
  const { isLoading: authLoading, isAuthorized, isAuthenticated, user } = useRequireAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [partnerStatus, setPartnerStatus] = useState<PartnerProfile | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      checkPartnerStatus();
      fetchOrders();
    }
  }, [isAuthenticated]);

  const checkPartnerStatus = async () => {
    setStatusLoading(true);
    const res = await fetchAPI<PartnerProfile>('/partners/me', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.success && res.data) {
      setPartnerStatus(unwrapData<PartnerProfile>(res.data));
    }
    setStatusLoading(false);
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetchAPI<Order[]>('/orders', {
        method: 'GET',
        credentials: 'include',
      });
      if (res.success && res.data) {
        const unwrapped = unwrapData<unknown>(res.data);
        setOrders(Array.isArray(unwrapped) ? unwrapped as Order[] : []);
      }
    } finally {
      setOrdersLoading(false);
    }
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

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized || !user) return null;

  const tabs = [
    { key: 'profile' as ActiveTab, label: 'Profil', icon: User },
    { key: 'orders' as ActiveTab, label: 'Pesanan', icon: Package },
    { key: 'settings' as ActiveTab, label: 'Pengaturan', icon: Settings },
  ];

  const partnerCard = (
    <PartnerStatusCard
      user={user}
      partnerStatus={partnerStatus}
      statusLoading={statusLoading}
      switching={loading}
      onSwitchRole={() => setShowSwitchModal(true)}
    />
  );

  const logoutButton = (
    <Button
      variant="secondary"
      className="w-full py-4 text-[#b51822] border-[#b51822] hover:bg-[#fdf2f2]"
      onClick={logout}
      disabled={loading}
    >
      <LogOut className="w-5 h-5 mr-2" />
      Keluar dari Akun
    </Button>
  );

  return (
    <div className="page-h bg-[#f7f5f4] pb-20 md:pb-8">
      {/* Header - Full Width (shared mobile & desktop) */}
      <div className="bg-[#b51822] text-white px-4 py-6 md:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 md:h-20 md:w-20 bg-white/20 rounded flex items-center justify-center text-2xl md:text-3xl font-bold text-white border-2 border-white/50">
              {getInitial(user?.name || '')}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{user.name}</h1>
              <p className="text-white/80 text-sm">{user.phone}</p>
              <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs text-white bg-white/20">
                <ShieldCheck className="w-3 h-3 mr-1" />
                {user.active_role === 'partner' ? 'Mode Mitra' : 'Mode Pelanggan'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Hub (< lg) — tiap menu navigasi ke halamannya sendiri */}
      <div className="lg:hidden max-w-lg mx-auto px-4 py-6 space-y-4">
        {partnerCard}

        <MenuCard title="Akun">
          <MenuListItem icon={User} label="Informasi Akun" subtitle="Nama, nomor HP, email" href="/profile/account" />
          <MenuListItem icon={ShieldCheck} label="Keamanan Akun" subtitle="Ubah kata sandi & keamanan" href="/profile/security" />
          <MenuListItem icon={MapPin} label="Buku Alamat" subtitle="Kelola alamat pengiriman" href="/profile/addresses" />
        </MenuCard>

        <MenuCard title="Aktivitas">
          <MenuListItem icon={Package} label="Pesanan" subtitle="Riwayat & status pesanan" badge={orders.length} href="/orders" />
          {/* Dompet wajib bisa diakses pelanggan: refund pembatalan/no-show
              masuk ke saldo, dan sebelumnya tidak ada satu pun jalan ke sini. */}
          <MenuListItem icon={Wallet} label="Dompet" subtitle="Saldo & riwayat refund" href="/profile/wallet" />
          <MenuListItem icon={Heart} label="Favorit" subtitle="Mitra & layanan tersimpan" href="/profile/favorites" />
          <MenuListItem icon={Mail} label="Notifikasi" subtitle="Email, push notification" href="/profile/notifications" />
        </MenuCard>

        <MenuCard title="Bantuan & Legal">
          <MenuListItem icon={Phone} label="Hubungi Kami" subtitle="FAQ, bantuan" href="/help" />
          <MenuListItem icon={FileText} label="Syarat & Ketentuan" href="/terms" />
          <MenuListItem icon={ShieldCheck} label="Kebijakan Privasi" href="/privacy" />
        </MenuCard>

        {logoutButton}

        <p className="text-center text-xs text-[#8f6f6d]">Versi 1.0.0</p>
      </div>

      {/* Desktop (lg+) — Two Column Layout dengan tab */}
      <div className="hidden lg:block max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* Left Sidebar - Partner Info + Menu */}
          <div className="w-72 shrink-0">
            {partnerCard}

            <MenuCard title="Menu">
              {tabs.map(tab => (
                <MenuListItem
                  key={tab.key}
                  icon={tab.icon}
                  label={tab.label}
                  onClick={() => setActiveTab(tab.key)}
                  active={activeTab === tab.key}
                  badge={tab.key === 'orders' ? orders.length : undefined}
                />
              ))}
            </MenuCard>
          </div>

          {/* Right Content - Tab Content */}
          <div className="flex-1">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Account Settings */}
                <MenuCard title="Informasi Akun">
                  <div className="w-full flex items-center p-4 text-left">
                    <User className="w-5 h-5 text-[#8f6f6d] mr-3" />
                    <div className="flex-1">
                      <span className="text-[#32201f] font-medium block text-sm">Nama</span>
                      <span className="text-xs text-[#8f6f6d]">{user.name}</span>
                    </div>
                  </div>
                  <div className="w-full flex items-center p-4 text-left">
                    <Phone className="w-5 h-5 text-[#8f6f6d] mr-3" />
                    <div className="flex-1">
                      <span className="text-[#32201f] font-medium block text-sm">Nomor HP</span>
                      <span className="text-xs text-[#8f6f6d]">{user.phone}</span>
                    </div>
                  </div>
                  <div className="w-full flex items-center p-4 text-left">
                    <Mail className="w-5 h-5 text-[#8f6f6d] mr-3" />
                    <div className="flex-1">
                      <span className="text-[#32201f] font-medium block text-sm">Email</span>
                      <span className="text-xs text-[#8f6f6d]">{user.email || 'Belum diisi'}</span>
                    </div>
                  </div>
                  <MenuListItem icon={ShieldCheck} label="Keamanan Akun" subtitle="Ubah kata sandi & keamanan" href="/profile/security" />
                  <MenuListItem icon={MapPin} label="Buku Alamat" subtitle="Kelola alamat pengiriman" href="/profile/addresses" />
                  <MenuListItem icon={Wallet} label="Dompet" subtitle="Saldo & riwayat refund" href="/profile/wallet" />
                </MenuCard>

                {logoutButton}

                <p className="text-center text-xs text-[#8f6f6d]">Versi 1.0.0</p>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {/* Filter Chips - Horizontal */}
                <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden p-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all' as FilterStatus, label: 'Semua' },
                      { key: 'pending' as FilterStatus, label: 'Menunggu' },
                      { key: 'processing' as FilterStatus, label: 'Berlangsung' },
                      { key: 'completed' as FilterStatus, label: 'Selesai' },
                      { key: 'cancelled' as FilterStatus, label: 'Dibatalkan' },
                    ].map(filter => (
                      <button
                        key={filter.key}
                        onClick={() => setActiveFilter(filter.key)}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded border transition-colors ${
                          activeFilter === filter.key
                            ? 'bg-[#b51822] text-white border-[#b51822]'
                            : 'bg-white text-[#5b403e] border-[#e5e2e1] hover:border-[#b51822]'
                        }`}
                      >
                        {filter.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          activeFilter === filter.key
                            ? 'bg-white/20 text-white'
                            : 'bg-[#e5e2e1] text-[#5b403e]'
                        }`}>
                          {filterCounts[filter.key]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orders List */}
                <div className="space-y-4">
                  {ordersLoading ? (
                    // Loading skeletons
                    <>
                      {[1, 2].map(i => (
                        <div key={i} className="bg-white rounded border border-[#e5e2e1] p-4 animate-pulse">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="h-4 w-32 bg-[#e5e2e1] rounded mb-2"></div>
                              <div className="h-3 w-24 bg-[#e5e2e1] rounded"></div>
                            </div>
                            <div className="h-6 w-20 bg-[#e5e2e1] rounded"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 w-full bg-[#e5e2e1] rounded"></div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : filteredOrders.length === 0 ? (
                    // Empty state
                    <div className="bg-white rounded border border-[#e5e2e1] p-8 text-center">
                      <Package className="w-16 h-16 text-[#8f6f6d]/50 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-[#32201f] mb-2">
                        {activeFilter === 'all' ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan'}
                      </h3>
                      <p className="text-sm text-[#8f6f6d] mb-4">
                        {activeFilter === 'all'
                          ? 'Anda belum memiliki pesanan.'
                          : 'Tidak ada pesanan dengan status ini.'}
                      </p>
                      {activeFilter === 'all' && (
                        <Button onClick={() => router.push('/')}>
                          Cari Jasa
                        </Button>
                      )}
                    </div>
                  ) : (
                    // Orders list
                    filteredOrders.map(order => {
                      return (
                        <div key={order.id} className="bg-white rounded border border-[#e5e2e1] overflow-hidden">
                          {/* Order Header */}
                          <div className="p-4 border-b border-[#e5e2e1] bg-[#f7f5f4]">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-[#32201f]">{order.order_number}</p>
                                <p className="text-xs text-[#8f6f6d] flex items-center gap-1 mt-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(order.created_at)}
                                </p>
                              </div>
                              <StatusBadge status={order.status as never} size="sm" />
                            </div>
                          </div>

                          {/* Order Content */}
                          <div className="p-4">
                            {/* Service Items */}
                            <div className="space-y-2 mb-4">
                              {order.items?.slice(0, 2).map(item => (
                                <div key={item.id} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-[#f7f5f4] rounded flex items-center justify-center">
                                      <Package className="w-4 h-4 text-[#8f6f6d]" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-[#32201f]">{item.service_name}</p>
                                      <p className="text-xs text-[#8f6f6d]">x{item.quantity}</p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-semibold text-[#32201f]">
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

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-[#e5e2e1]">
                              <div>
                                <p className="text-xs text-[#8f6f6d]">Total</p>
                                <p className="text-lg font-bold text-[#b51822]">{formatPrice(order.total_amount)}</p>
                              </div>
                              <Button size="sm" className="bg-[#b51822] hover:bg-[#90121a]" onClick={() => router.push(`/orders/${order.id}`)}>
                                Detail
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                {/* Account Settings */}
                <MenuCard title="Pengaturan Akun">
                  <MenuListItem icon={Settings} label="Pengaturan Keamanan" subtitle="Password, PIN, autentikasi" href="/profile/security" />
                  <MenuListItem icon={Heart} label="Favorit" subtitle="Mitra & layanan tersimpan" href="/profile/favorites" />
                  <MenuListItem icon={Mail} label="Notifikasi" subtitle="Email, push notification" href="/profile/notifications" />
                  <MenuListItem icon={Phone} label="Hubungi Kami" subtitle="FAQ, bantuan" href="/help" />
                </MenuCard>

                {/* Legal & Support */}
                <MenuCard title="Bantuan & Legal">
                  <MenuListItem icon={FileText} label="Syarat & Ketentuan" href="/terms" />
                  <MenuListItem icon={ShieldCheck} label="Kebijakan Privasi" href="/privacy" />
                </MenuCard>
              </div>
            )}
          </div>
        </div>
      </div>

      <SwitchRoleModal isOpen={showSwitchModal} onClose={() => setShowSwitchModal(false)} />
    </div>
  );
}
