"use client";

import { getInitial } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, LogOut, FileText, Settings, ShieldCheck, MapPin, ChevronRight, Phone, Mail, Package, Calendar, Heart, Wallet, TicketPercent, CreditCard, Trash2, AtSign, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { MenuCard, MenuListItem } from '@/components/ui/menu-list-item';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import { formatDateOnly, formatPrice } from '@/lib/format';
import { fetchAPI } from '@/lib/api';
import { FilterStatus, matchesFilter } from '@/lib/order-utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SwitchRoleModal } from '@/components/ui/switch-role-modal';
import PartnerStatusCard, { type PartnerProfile } from '@/components/profile/PartnerStatusCard';
import ProfileCompletionBanner from '@/components/profile/ProfileCompletionBanner';
import PhoneVerificationModal from '@/components/ui/PhoneVerificationModal';


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
  // redirect ke /login . mencegah hard-load mental ke login saat sesi masih ada.
  const { isLoading: authLoading, isAuthorized, isAuthenticated, user } = useRequireAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
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

  async function checkPartnerStatus() {
    setStatusLoading(true);
    const res = await fetchAPI<PartnerProfile>('/partners/me', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.success && res.data) {
      setPartnerStatus((res.data as PartnerProfile));
    }
    setStatusLoading(false);
  };

  async function fetchOrders() {
    setOrdersLoading(true);
    try {
      const res = await fetchAPI<Order[]>('/orders', {
        method: 'GET',
        credentials: 'include',
      });
      if (res.success && res.data) {
        const unwrapped = (res.data as unknown);
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

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
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
      className="w-full py-4 text-brand-red border-brand-red hover:bg-brand-red-soft"
      onClick={logout}
      disabled={loading}
    >
      <LogOut className="w-5 h-5 mr-2" />
      Keluar dari Akun
    </Button>
  );

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-8">
      {/* Header - Full Width (shared mobile & desktop) */}
      <div className="bg-gradient-to-br from-brand-red via-brand-red-accent to-brand-red text-white px-4 py-6 md:py-10 relative overflow-hidden shadow-md">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-4 md:gap-6">
            {/* Foto profil . inisial hanya dipakai bila avatar belum diunggah
                (dulu inisial SELALU dirender, jadi foto tak pernah tampil). */}
            <div className="relative h-16 w-16 md:h-24 md:w-24 shrink-0 overflow-hidden bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-4xl font-extrabold text-white border border-white/30 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={`Foto profil ${user.name}`}
                  fill
                  sizes="(max-width: 768px) 64px, 96px"
                  className="object-cover"
                />
              ) : (
                getInitial(user?.name || '')
              )}
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold tracking-tight drop-shadow-sm">{user.name}</h1>
              {user.username && <p className="text-white/80 text-xs md:text-sm font-medium mt-0.5 drop-shadow-sm">@{user.username}</p>}
              <p className="text-white/90 text-[13px] md:text-sm font-medium mt-0.5 md:mt-1 drop-shadow-sm">{user.phone || 'Nomor HP belum diisi'}</p>
              <div className="mt-2 md:mt-3 inline-flex items-center px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold text-white bg-white/20 backdrop-blur-sm border border-white/20 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                {user.active_role === 'partner' ? 'Mode Mitra' : 'Mode Pelanggan'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!user.profile_complete && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <ProfileCompletionBanner onVerify={() => setShowPhoneModal(true)} />
        </div>
      )}

      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={() => setShowPhoneModal(false)}
      />

      {/* Mobile Hub (< lg) . tiap menu navigasi ke halamannya sendiri */}
      <div className="lg:hidden max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Transaction Summary . Item 19 */}
        {orders.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-brand-gray-900">Ringkasan Pesanan</h3>
              <Link href="/orders" className="text-xs text-brand-red font-medium hover:underline">Lihat semua</Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([
                { count: filterCounts.pending, label: 'Menunggu', status: 'pending' },
                { count: filterCounts.processing, label: 'Berjalan', status: 'processing' },
                { count: filterCounts.completed, label: 'Selesai', status: 'completed' },
                { count: filterCounts.cancelled, label: 'Batal', status: 'cancelled' },
              ]).map(s => (
                <Link key={s.label} href={`/orders?status=${s.status}`} className="flex flex-col items-center gap-0.5">
                  <span className="text-xl font-bold text-brand-gray-900 leading-none">{s.count}</span>
                  <span className="text-[11px] text-brand-gray-400 leading-none">{s.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {partnerCard}

        <MenuCard title="Akun">
          <MenuListItem icon={User} label="Informasi Akun" subtitle="Username, nama, nomor HP, email" href="/profile/account" />
          <MenuListItem icon={ShieldCheck} label="Keamanan Akun" subtitle="Ubah kata sandi & keamanan" href="/profile/security" />
          <MenuListItem icon={MapPin} label="Buku Alamat" subtitle="Kelola alamat pengiriman" href="/profile/addresses" />
        </MenuCard>

        <MenuCard title="Aktivitas">
          <MenuListItem icon={Package} label="Pesanan" subtitle="Riwayat & status pesanan" badge={orders.length} href="/orders" />
          {/* Dompet wajib bisa diakses pelanggan: refund pembatalan/no-show
              masuk ke saldo, dan sebelumnya tidak ada satu pun jalan ke sini. */}
          <MenuListItem icon={Wallet} label="Dompet" subtitle="Saldo, tarik dana & riwayat refund" href="/profile/wallet" />
          {/* Tujuan pencairan saldo. Tanpa baris ini satu-satunya jalan ke
              halaman rekening adalah lewat tombol di dalam form penarikan. */}
          <MenuListItem icon={CreditCard} label="Rekening Bank" subtitle="Tujuan pencairan saldo" href="/profile/bank-account" />
          <MenuListItem icon={TicketPercent} label="Promo" subtitle="Voucher & diskon aktif" href="/promos" />
          <MenuListItem icon={Heart} label="Favorit" subtitle="Mitra & layanan tersimpan" href="/profile/favorites" />
          <MenuListItem icon={Mail} label="Notifikasi" subtitle="Email, push notification" href="/profile/notifications" />
        </MenuCard>

        <MenuCard title="Bantuan & Legal">
          <MenuListItem icon={Phone} label="Hubungi Kami" subtitle="FAQ, bantuan" href="/help" />
          <MenuListItem icon={FileText} label="Syarat & Ketentuan" href="/terms" />
          <MenuListItem icon={ShieldCheck} label="Kebijakan Privasi" href="/privacy" />
          {/* Satu-satunya tautan ke sini dulu ada di Footer, dan Footer
              `hidden md:block` . jadi pengguna ponsel, mayoritas pengguna,
              tidak punya jalan ke penghapusan akun sama sekali (audit A4). */}
          <MenuListItem icon={Trash2} label="Hapus Akun" subtitle="Ajukan penghapusan akun permanen" href="/hapus-akun" />
        </MenuCard>

        {logoutButton}

        <p className="text-center text-xs text-brand-gray-400">Versi 1.0.0</p>
      </div>

      {/* Desktop (lg+) . Two Column Layout dengan tab */}
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
                {/* Transaction Summary . Item 19 */}
                {orders.length > 0 && (
                  <div className="bg-white rounded-lg border border-brand-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-brand-gray-900">Ringkasan Pesanan</h3>
                      <Link href="/orders" className="text-xs text-brand-red font-medium hover:underline">Lihat semua</Link>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { count: filterCounts.pending, label: 'Menunggu' },
                        { count: filterCounts.processing, label: 'Berjalan' },
                        { count: filterCounts.completed, label: 'Selesai' },
                        { count: filterCounts.cancelled, label: 'Batal' },
                      ]).map(s => (
                        <Link key={s.label} href="/orders" className="flex flex-col items-center gap-0.5">
                          <span className="text-xl font-bold text-brand-gray-900 leading-none">{s.count}</span>
                          <span className="text-[11px] text-brand-gray-400 leading-none">{s.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Settings . baris di bawah READ-ONLY; seluruh penyuntingan
                    (username, nama, email, foto) lewat "Kelola Informasi Akun" →
                    /profile/account, sama seperti jalur mobile. */}
                <MenuCard title="Informasi Akun">
                  <div className="w-full flex items-center p-4 text-left">
                    <AtSign className="w-5 h-5 text-brand-gray-400 mr-3" />
                    <div className="flex-1">
                      <span className="text-brand-gray-800 font-medium block text-sm">Username</span>
                      <span className="text-xs text-brand-gray-400">@{user.username}</span>
                    </div>
                  </div>
                  <div className="w-full flex items-center p-4 text-left">
                    <User className="w-5 h-5 text-brand-gray-400 mr-3" />
                    <div className="flex-1">
                      <span className="text-brand-gray-800 font-medium block text-sm">Nama</span>
                      <span className="text-xs text-brand-gray-400">{user.name}</span>
                    </div>
                  </div>
                  <div className="w-full flex items-center p-4 text-left">
                    <Phone className="w-5 h-5 text-brand-gray-400 mr-3" />
                    <div className="flex-1">
                      <span className="text-brand-gray-800 font-medium block text-sm">Nomor HP</span>
                      <span className="text-xs text-brand-gray-400">{user.phone || 'Belum diisi'}</span>
                    </div>
                    {!user.phone_verified && (
                      <span className="text-[10px] font-bold text-brand-warning-dark bg-brand-warning-soft border border-brand-warning-border px-2 py-0.5 rounded-full">
                        Belum terverifikasi
                      </span>
                    )}
                  </div>
                  <div className="w-full flex items-center p-4 text-left">
                    <Mail className="w-5 h-5 text-brand-gray-400 mr-3" />
                    <div className="flex-1">
                      <span className="text-brand-gray-800 font-medium block text-sm">Email</span>
                      <span className="text-xs text-brand-gray-400">{user.email || 'Belum diisi'}</span>
                    </div>
                  </div>
                  <MenuListItem icon={Pencil} label="Kelola Informasi Akun" subtitle="Ubah username, nama, email & foto profil" href="/profile/account" />
                  <MenuListItem icon={ShieldCheck} label="Keamanan Akun" subtitle="Ubah kata sandi & keamanan" href="/profile/security" />
                  <MenuListItem icon={MapPin} label="Buku Alamat" subtitle="Kelola alamat pengiriman" href="/profile/addresses" />
                  <MenuListItem icon={Wallet} label="Dompet" subtitle="Saldo, tarik dana & riwayat refund" href="/profile/wallet" />
                  <MenuListItem icon={CreditCard} label="Rekening Bank" subtitle="Tujuan pencairan saldo" href="/profile/bank-account" />
                  <MenuListItem icon={TicketPercent} label="Promo" subtitle="Voucher & diskon aktif" href="/promos" />
                </MenuCard>

                {logoutButton}

                <p className="text-center text-xs text-brand-gray-400">Versi 1.0.0</p>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {/* Filter Chips - Horizontal */}
                <div className="bg-white rounded-lg border border-brand-gray-100 overflow-hidden p-4">
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
                        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded border transition-colors ${activeFilter === filter.key
                            ? 'bg-brand-red text-white border-brand-red'
                            : 'bg-white text-brand-gray-700 border-brand-gray-100 hover:border-brand-red'
                          }`}
                      >
                        {filter.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFilter === filter.key
                            ? 'bg-white/20 text-white'
                            : 'bg-brand-gray-100 text-brand-gray-700'
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
                        <div key={i} className="bg-white rounded-lg border border-brand-gray-100 p-4 animate-pulse">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="h-4 w-32 bg-brand-gray-100 rounded mb-2"></div>
                              <div className="h-3 w-24 bg-brand-gray-100 rounded"></div>
                            </div>
                            <div className="h-6 w-20 bg-brand-gray-100 rounded"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 w-full bg-brand-gray-100 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : filteredOrders.length === 0 ? (
                    // Empty state
                    <div className="bg-white rounded-lg border border-brand-gray-100 p-8 text-center">
                      <Package className="w-16 h-16 text-brand-gray-400/50 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-brand-gray-800 mb-2">
                        {activeFilter === 'all' ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan'}
                      </h3>
                      <p className="text-sm text-brand-gray-400 mb-4">
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
                        <div key={order.id} className="bg-white rounded-lg border border-brand-gray-100 overflow-hidden">
                          {/* Order Header */}
                          <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-60">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-brand-gray-800">{order.order_number}</p>
                                <p className="text-xs text-brand-gray-400 flex items-center gap-1 mt-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDateOnly(order.created_at)}
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
                                    <div className="w-8 h-8 bg-brand-gray-60 rounded flex items-center justify-center">
                                      <Package className="w-4 h-4 text-brand-gray-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-brand-gray-800">{item.service_name}</p>
                                      <p className="text-xs text-brand-gray-400">x{item.quantity}</p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-semibold text-brand-gray-800">
                                    {formatPrice(item.price * item.quantity)}
                                  </p>
                                </div>
                              ))}
                              {order.items && order.items.length > 2 && (
                                <p className="text-xs text-brand-gray-400 pl-10">
                                  +{order.items.length - 2} layanan lainnya
                                </p>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-brand-gray-100">
                              <div>
                                <p className="text-xs text-brand-gray-400">Total</p>
                                <p className="text-lg font-bold text-brand-red">{formatPrice(order.total_amount)}</p>
                              </div>
                              <Button size="sm" className="bg-brand-red hover:bg-brand-red-dark" onClick={() => router.push(`/orders/${order.id}`)}>
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
                  <MenuListItem icon={ShieldCheck} label="Keamanan Akun" subtitle="Ubah kata sandi & keamanan" href="/profile/security" />
                  <MenuListItem icon={Heart} label="Favorit" subtitle="Mitra & layanan tersimpan" href="/profile/favorites" />
                  <MenuListItem icon={Mail} label="Notifikasi" subtitle="Email, push notification" href="/profile/notifications" />
                  <MenuListItem icon={Phone} label="Hubungi Kami" subtitle="FAQ, bantuan" href="/help" />
                </MenuCard>

                {/* Legal & Support */}
                <MenuCard title="Bantuan & Legal">
                  <MenuListItem icon={FileText} label="Syarat & Ketentuan" href="/terms" />
                  <MenuListItem icon={ShieldCheck} label="Kebijakan Privasi" href="/privacy" />
                  <MenuListItem icon={Trash2} label="Hapus Akun" subtitle="Ajukan penghapusan akun permanen" href="/hapus-akun" />
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
