"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, ChevronRight, MapPin, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';

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

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled';

export default function OrdersPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchOrders = async () => {
    setLoading(true);
    const res = await fetchAPI<{ data: Order[] }>('/orders', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.success && res.data && Array.isArray(res.data)) {
      setOrders(res.data as Order[]);
    }
    setLoading(false);
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
    : orders.filter(order => order.status === activeFilter);

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

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </Link>
            <h1 className="text-lg font-bold text-[#1c1b1b]">Riwayat Pesanan</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar Filters */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-lg border border-[#e5e2e1] overflow-hidden">
              <div className="p-4 border-b border-[#e5e2e1]">
                <h3 className="font-semibold text-[#32201f]">Filter</h3>
              </div>
              <div className="divide-y divide-[#e5e2e1]">
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
                    className={`w-full flex items-center justify-between p-4 hover:bg-[#f7f5f4] transition-colors text-left ${
                      activeFilter === filter.key ? 'bg-[#fdf2f2]' : ''
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      activeFilter === filter.key ? 'text-[#b51822]' : 'text-[#32201f]'
                    }`}>
                      {filter.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      activeFilter === filter.key
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

          {/* Orders List */}
          <div className="flex-1 space-y-4">
            {loading ? (
              // Loading skeletons
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-lg border border-[#e5e2e1] p-4 animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="h-4 w-32 bg-[#e5e2e1] rounded mb-2"></div>
                        <div className="h-3 w-24 bg-[#e5e2e1] rounded"></div>
                      </div>
                      <div className="h-6 w-20 bg-[#e5e2e1] rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-[#e5e2e1] rounded"></div>
                      <div className="h-3 w-3/4 bg-[#e5e2e1] rounded"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : filteredOrders.length === 0 ? (
              // Empty state
              <div className="bg-white rounded-lg border border-[#e5e2e1] p-8 text-center">
                <Package className="w-16 h-16 text-[#8f6f6d]/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#32201f] mb-2">
                  {activeFilter === 'all' ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan'}
                </h3>
                <p className="text-sm text-[#8f6f6d] mb-6">
                  {activeFilter === 'all'
                    ? 'Anda belum memiliki pesanan. Mulai pesan jasa sekarang!'
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
                  <div key={order.id} className="bg-white rounded-lg border border-[#e5e2e1] overflow-hidden">
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

                      {/* Partner Info */}
                      {order.partner_name && (
                        <div className="flex items-center gap-3 p-3 bg-[#f7f5f4] rounded mb-4">
                          <div className="w-10 h-10 bg-[#e5e2e1] rounded flex items-center justify-center text-sm font-bold text-[#5b403e]">
                            {order.partner_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#32201f]">{order.partner_name}</p>
                            <p className="text-xs text-[#8f6f6d]">Mitra</p>
                          </div>
                        </div>
                      )}

                      {/* Service Info */}
                      {order.service_date && (
                        <div className="flex items-center gap-2 text-xs text-[#8f6f6d] mb-4">
                          <Calendar className="w-4 h-4" />
                          <span>Jadwal: {formatDate(order.service_date)}</span>
                        </div>
                      )}

                      {order.service_address && (
                        <div className="flex items-center gap-2 text-xs text-[#8f6f6d] mb-4">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{order.service_address}</span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#e5e2e1]">
                        <div>
                          <p className="text-xs text-[#8f6f6d]">Total</p>
                          <p className="text-lg font-bold text-[#b51822]">{formatPrice(order.total_amount)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {order.status === 'completed' && (
                            <Button size="sm" variant="secondary" className="border-[#e5e2e1] text-[#5b403e]">
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Ulasan
                            </Button>
                          )}
                          <Button size="sm" className="bg-[#b51822] hover:bg-[#90121a]">
                            Detail
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
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
