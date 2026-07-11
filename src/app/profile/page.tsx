"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { User, LogOut, FileText, Settings, ShieldCheck, MapPin, ChevronRight, Briefcase, Phone, Mail, Star, Clock, TrendingUp, Package, Calendar, CheckCircle, XCircle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { unwrapData } from '@/lib/order-utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';
import { SwitchRoleModal } from '@/components/ui/switch-role-modal';


interface PartnerProfile {
  id: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  is_online: boolean;
}

interface OrderItem {
  id: string;
  service_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'on_the_way' | 'in_progress';
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
type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled';

export default function ProfilePage() {
  const { user, isAuthenticated, logout, switchRole, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [partnerStatus, setPartnerStatus] = useState<PartnerProfile | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      checkPartnerStatus();
      fetchOrders();
    }
  }, [isAuthenticated, router]);

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
    const res = await fetchAPI<Order[]>('/orders', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.success && res.data) {
      setOrders(Array.isArray(res.data) ? res.data as Order[] : []);
    }
    setOrdersLoading(false);
  };

  const getStatusConfig = (status: Order['status']) => {
    const configs = {
      pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      processing: { label: 'Diproses', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Package },
      in_progress: { label: 'Sedang Dikerjakan', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Clock },
      on_the_way: { label: 'Dalam Perjalanan', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: MapPin },
      completed: { label: 'Selesai', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    };
    return configs[status] || configs.pending;
  };

  const filteredOrders = activeFilter === 'all'
    ? orders
    : orders.filter(order => {
      if (activeFilter === 'pending') return order.status === 'pending';
      if (activeFilter === 'processing') return ['processing', 'in_progress', 'on_the_way'].includes(order.status);
      if (activeFilter === 'completed') return order.status === 'completed';
      if (activeFilter === 'cancelled') return order.status === 'cancelled';
      return true;
    });

  const filterCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => ['processing', 'in_progress', 'on_the_way'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
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

  if (!user || !isAuthenticated) return null;

  const tabs = [
    { key: 'profile' as ActiveTab, label: 'Profil', icon: User },
    { key: 'orders' as ActiveTab, label: 'Pesanan', icon: Package },
    { key: 'settings' as ActiveTab, label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="page-h bg-[#f7f5f4] pb-20 md:pb-8">
      {/* Header - Full Width */}
      <div className="bg-[#b51822] text-white px-4 py-6 md:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 md:h-20 md:w-20 bg-white/20 rounded flex items-center justify-center text-2xl md:text-3xl font-bold text-white border-2 border-white/50">
              {user.name.charAt(0).toUpperCase()}
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

      {/* Main Content - Two Column Layout */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left Sidebar - Partner Info */}
          <div className="w-full lg:w-72 shrink-0">
            {/* Partner Stats Card (if partner) */}
            {partnerStatus?.verification_status === 'approved' && (
              <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden mb-4">
                <div className="p-4 border-b border-[#e5e2e1] bg-[#fdf2f2]">
                  <div className="flex items-center">
                    <div className="p-2 bg-[#b51822]/10 rounded mr-3">
                      <Briefcase className="w-5 h-5 text-[#b51822]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#32201f] text-sm">Status Partner</p>
                      <p className="text-xs text-[#8f6f6d]">Terverifikasi</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <Star className="w-4 h-4 text-[#D69E2E] mx-auto mb-1" />
                    <p className="text-lg font-bold text-[#32201f]">{partnerStatus && 'rating' in partnerStatus ? (partnerStatus as any).rating?.toFixed(1) ?? '—' : '—'}</p>
                    <p className="text-xs text-[#8f6f6d]">Rating</p>
                  </div>
                  <div>
                    <Clock className="w-4 h-4 text-[#3182CE] mx-auto mb-1" />
                    <p className="text-lg font-bold text-[#32201f]">{partnerStatus && 'total_orders' in partnerStatus ? (partnerStatus as any).total_orders ?? 0 : 0}</p>
                    <p className="text-xs text-[#8f6f6d]">Order</p>
                  </div>
                  <div>
                    <TrendingUp className="w-4 h-4 text-[#38A169] mx-auto mb-1" />
                    <p className="text-lg font-bold text-[#32201f]">{partnerStatus && 'acceptance_rate' in partnerStatus ? `${(partnerStatus as any).acceptance_rate ?? 0}%` : '—'}</p>
                    <p className="text-xs text-[#8f6f6d]">Acc Rate</p>
                  </div>
                </div>
                <div className="p-4 border-t border-[#e5e2e1]">
                  <Button
                    size="sm"
                    variant={user.active_role === 'partner' ? 'secondary' : 'primary'}
                    className="w-full"
                    onClick={() => setShowSwitchModal(true)}
                    disabled={loading}
                  >
                    {user.active_role === 'partner' ? 'Ke Pelanggan' : 'Ke Mitra'}
                  </Button>
                </div>
              </div>
            )}

            {/* Partner Registration / Verification Card (belum approved) */}
            {!statusLoading && partnerStatus?.verification_status !== 'approved' && (
              <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden mb-4">
                <div className="p-4 text-center">
                  <Briefcase className="w-12 h-12 text-[#8f6f6d]/50 mx-auto mb-3" />
                  <p className="font-semibold text-[#32201f] mb-1">
                    {partnerStatus?.verification_status === 'pending' ? 'Pendaftaran Mitra' : 'Jadilah Mitra Kami'}
                  </p>
                  <p className="text-xs text-[#8f6f6d] mb-4">
                    {partnerStatus?.verification_status === 'pending'
                      ? 'Dokumen Anda sedang kami tinjau.'
                      : 'Daftar sebagai mitra dan mulai hasilkan uang tambahan.'}
                  </p>
                  {!partnerStatus ? (
                    <Button className="w-full" onClick={() => router.push('/mitra/register')}>
                      Daftar Jadi Mitra
                    </Button>
                  ) : partnerStatus.verification_status === 'pending' ? (
                    <div className="bg-yellow-50 rounded p-3 border border-yellow-200">
                      <p className="text-xs text-yellow-800 font-medium">Verifikasi Diproses</p>
                      <p className="text-xs text-yellow-700 mt-1">Maks. 24 jam</p>
                    </div>
                  ) : partnerStatus.verification_status === 'rejected' ? (
                    <div className="space-y-2">
                      {partnerStatus.rejection_reason && (
                        <div className="bg-red-50 rounded p-3 border border-red-200 text-left">
                          <p className="text-xs font-medium text-[#b51822]">Pendaftaran ditolak:</p>
                          <p className="text-xs text-[#5b403e] mt-1">{partnerStatus.rejection_reason}</p>
                        </div>
                      )}
                      <Button size="sm" variant="danger" className="w-full border-[#b51822]" onClick={() => router.push('/mitra/register')}>
                        Perbaiki & Kirim Ulang
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden">
              <div className="p-4 border-b border-[#e5e2e1]">
                <h3 className="font-semibold text-[#32201f]">Menu</h3>
              </div>
              <div className="divide-y divide-[#e5e2e1]">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  const count = tab.key === 'orders' ? orders.length : null;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center p-4 transition-colors text-left ${
                        isActive ? 'bg-[#fdf2f2]' : 'hover:bg-[#f7f5f4]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#b51822]' : 'text-[#8f6f6d]'}`} />
                      <span className={`text-sm font-medium flex-1 ${isActive ? 'text-[#b51822]' : 'text-[#32201f]'}`}>
                        {tab.label}
                      </span>
                      {count !== null && count > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded ${isActive ? 'bg-[#b51822] text-white' : 'bg-[#e5e2e1] text-[#5b403e]'}`}>
                          {count}
                        </span>
                      )}
                      {!isActive && <ChevronRight className="w-4 h-4 text-[#d4c8c7]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Content - Tab Content */}
          <div className="flex-1">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Account Settings */}
                <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden">
                  <div className="p-4 border-b border-[#e5e2e1]">
                    <h3 className="font-semibold text-[#32201f]">Informasi Akun</h3>
                  </div>
                  <div className="divide-y divide-[#e5e2e1]">
                    <Link href="/profile/security" className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
                      <User className="w-5 h-5 text-[#8f6f6d] mr-3" />
                      <div className="flex-1">
                        <span className="text-[#32201f] font-medium block text-sm">Nama</span>
                        <span className="text-xs text-[#8f6f6d]">{user.name}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
                    </Link>
                    <Link href="/profile/security" className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
                      <Phone className="w-5 h-5 text-[#8f6f6d] mr-3" />
                      <div className="flex-1">
                        <span className="text-[#32201f] font-medium block text-sm">Nomor HP</span>
                        <span className="text-xs text-[#8f6f6d]">{user.phone}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
                    </Link>
                    <Link href="/profile/security" className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
                      <Mail className="w-5 h-5 text-[#8f6f6d] mr-3" />
                      <div className="flex-1">
                        <span className="text-[#32201f] font-medium block text-sm">Email</span>
                        <span className="text-xs text-[#8f6f6d]">{user.email || 'Belum diisi'}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
                    </Link>
                    <Link href="/profile/addresses" className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
                      <MapPin className="w-5 h-5 text-[#8f6f6d] mr-3" />
                      <div className="flex-1">
                        <span className="text-[#32201f] font-medium block text-sm">Buku Alamat</span>
                        <span className="text-xs text-[#8f6f6d]">Kelola alamat pengiriman</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
                    </Link>
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  variant="secondary"
                  className="w-full py-4 text-[#b51822] border-[#b51822] hover:bg-[#fdf2f2]"
                  onClick={logout}
                  disabled={loading}
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Keluar dari Akun
                </Button>

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
                      const statusConfig = getStatusConfig(order.status);
                      const StatusIcon = statusConfig.icon;

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
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded ${statusConfig.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </span>
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
                              <Button size="sm" className="bg-[#b51822] hover:bg-[#90121a]">
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
                <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden">
                  <div className="p-4 border-b border-[#e5e2e1]">
                    <h3 className="font-semibold text-[#32201f]">Pengaturan Akun</h3>
                  </div>
                  <div className="divide-y divide-[#e5e2e1]">
                    <button className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
                      <Settings className="w-5 h-5 text-[#8f6f6d] mr-3" />
                      <div className="flex-1">
                        <span className="text-[#32201f] font-medium block text-sm">Pengaturan Keamanan</span>
                        <span className="text-xs text-[#8f6f6d]">Password, PIN, autentikasi</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
                    </button>
                    <Link href="/profile/favorites" className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
                      <Heart className="w-5 h-5 text-[#8f6f6d] mr-3" />
                      <div className="flex-1">
                        <span className="text-[#32201f] font-medium block text-sm">Favorit</span>
                        <span className="text-xs text-[#8f6f6d]">Mitra & layanan tersimpan</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
                    </Link>
                    <Link href="/profile/notifications" className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
                      <Mail className="w-5 h-5 text-[#8f6f6d] mr-3" />
                      <div className="flex-1">
                        <span className="text-[#32201f] font-medium block text-sm">Notifikasi</span>
                        <span className="text-xs text-[#8f6f6d]">Email, push notification</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
                    </Link>
                    <button className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
                      <Phone className="w-5 h-5 text-[#8f6f6d] mr-3" />
                      <div className="flex-1">
                        <span className="text-[#32201f] font-medium block text-sm">Hubungi Kami</span>
                        <span className="text-xs text-[#8f6f6d]">FAQ, bantuan</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
                    </button>
                  </div>
                </div>

                {/* Legal & Support */}
                <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden">
                  <div className="p-4 border-b border-[#e5e2e1]">
                    <h3 className="font-semibold text-[#32201f]">Bantuan & Legal</h3>
                  </div>
                  <div className="divide-y divide-[#e5e2e1]">
                    <button className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
                      <FileText className="w-5 h-5 text-[#8f6f6d] mr-3" />
                      <div className="flex-1">
                        <span className="text-[#32201f] font-medium block text-sm">Syarat & Ketentuan</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
                    </button>
                    <button className="w-full flex items-center p-4 hover:bg-[#f7f5f4] transition-colors text-left">
                      <ShieldCheck className="w-5 h-5 text-[#8f6f6d] mr-3" />
                      <div className="flex-1">
                        <span className="text-[#32201f] font-medium block text-sm">Kebijakan Privasi</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d4c8c7]" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <SwitchRoleModal isOpen={showSwitchModal} onClose={() => setShowSwitchModal(false)} />
    </div>
  );
}

