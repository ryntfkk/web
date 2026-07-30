"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, FileText, CheckCircle, CreditCard, AlertTriangle, DollarSign } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { ListItemSkeleton } from '@/components/ui/skeleton';


interface Notification {
  id: string;
  title: string;
  body: string;
  // Backend mengirim string bebas (mis. 'review_reminder', 'order_update').
  type: string;
  reference_id?: string;
  // Backend menaruh id terkait di metadata (mis. { order_id }).
  metadata?: { order_id?: string; [k: string]: unknown };
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    fetchNotifications();
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/notifications');
    if (res.success && res.data) {
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      setNotifications(list);
    }
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await fetchAPI('/notifications/read-all', { method: 'PUT' });
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      await fetchAPI(`/notifications/${n.id}/read`, { method: 'PUT' });
    }
    
    const ref = n.reference_id || n.metadata?.order_id;
    const t = (n.type || '').toLowerCase();

    if (t === 'withdrawal') {
      router.push(user?.active_role === 'partner' ? '/mitra/wallet' : '/profile/wallet');
      return;
    }
    if (ref) {
      if (t.includes('payment')) {
        router.push(`/payment/${ref}`);
      } else {
        router.push(`/orders/${ref}`);
      }
    }
  };

  const getIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('payment')) return <CreditCard className="w-5 h-5 text-brand-orange" />;
    if (t.includes('dispute')) return <AlertTriangle className="w-5 h-5 text-brand-red" />;
    if (t.includes('withdraw')) return <DollarSign className="w-5 h-5 text-brand-gray-700" />;
    if (t.includes('review')) return <CheckCircle className="w-5 h-5 text-brand-success" />;
    if (t.includes('order')) return <FileText className="w-5 h-5 text-brand-info" />;
    if (t === 'system') return <CheckCircle className="w-5 h-5 text-brand-success" />;
    return <Bell className="w-5 h-5 text-brand-gray-400" />;
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return 'Hari ini, ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ListItemSkeleton count={8} /></div>;
  if (!isAuthorized) return null;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'transaction') return n.type.toLowerCase().includes('order') || n.type.toLowerCase().includes('payment');
    if (activeFilter === 'system') return n.type.toLowerCase() === 'system' || n.type.toLowerCase().includes('review');
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const dateBucket = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday); startYesterday.setDate(startToday.getDate() - 1);
    const startWeek = new Date(startToday); startWeek.setDate(startToday.getDate() - 7);
    if (d >= startToday) return 'Hari Ini';
    if (d >= startYesterday) return 'Kemarin';
    if (d >= startWeek) return 'Minggu Ini';
    return 'Lebih Lama';
  };
  const groupedNotifications = ['Hari Ini', 'Kemarin', 'Minggu Ini', 'Lebih Lama']
    .map((label) => ({ label, items: filteredNotifications.filter((n) => dateBucket(n.created_at) === label) }))
    .filter((g) => g.items.length > 0);

  const renderCard = (n: Notification) => (
    <div
      key={n.id}
      onClick={() => handleNotificationClick(n)}
      className={`bg-white rounded-lg border border-brand-gray-100 p-4 flex gap-4 cursor-pointer transition-colors ${!n.is_read ? 'bg-brand-error-soft border-brand-error-border' : 'hover:bg-brand-gray-60'}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-white' : 'bg-brand-gray-60'}`}>
        {getIcon(n.type)}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm mb-1 ${!n.is_read ? 'font-bold text-brand-gray-900' : 'font-semibold text-brand-gray-700'}`}>
          {n.title}
        </h3>
        <p className={`text-sm mb-2 leading-snug ${!n.is_read ? 'text-brand-gray-800' : 'text-brand-gray-450'}`}>
          {n.body}
        </p>
        <p className="text-[10px] text-brand-gray-450 font-medium uppercase tracking-wide">
          {formatTime(n.created_at)}
        </p>
      </div>
      {!n.is_read && (
        <div className="shrink-0 pt-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-red" />
        </div>
      )}
    </div>
  );

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      <MobilePageHeader
        title="Notifikasi"
        right={unreadCount > 0 ? (
          <button onClick={handleMarkAllRead} className="text-sm font-semibold text-brand-red hover:underline">
            Tandai semua dibaca
          </button>
        ) : undefined}
      />

      <div className="hidden lg:flex max-w-lg mx-auto px-4 pt-8 items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-gray-900">Notifikasi</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-sm font-semibold text-brand-red hover:underline">
            Tandai semua dibaca
          </button>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === 'all' ? 'bg-brand-red text-white' : 'bg-white border border-brand-gray-100 text-brand-gray-700 hover:bg-brand-gray-60'}`}
          >
            Semua
          </button>
          <button 
            onClick={() => setActiveFilter('transaction')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === 'transaction' ? 'bg-brand-red text-white' : 'bg-white border border-brand-gray-100 text-brand-gray-700 hover:bg-brand-gray-60'}`}
          >
            Transaksi
          </button>
          <button 
            onClick={() => setActiveFilter('system')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === 'system' ? 'bg-brand-red text-white' : 'bg-white border border-brand-gray-100 text-brand-gray-700 hover:bg-brand-gray-60'}`}
          >
            Sistem
          </button>
        </div>
        
        {loading ? (
          <ListItemSkeleton count={4} />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState icon={Bell} title="Belum Ada Notifikasi" description="Notifikasi pesanan, pembayaran, dan info penting akan muncul di sini." />
        ) : (
          <div className="space-y-5">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                <h2 className="text-xs font-semibold text-brand-gray-400 uppercase tracking-wide px-1 mb-2">{group.label}</h2>
                <div className="space-y-2">
                  {group.items.map(renderCard)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

