"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, FileText, CheckCircle, CreditCard, AlertTriangle, DollarSign, Loader2 } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { EmptyState } from '@/components/ui/empty-state';


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
    if (t.includes('payment')) return <CreditCard className="w-5 h-5 text-[#DD6B20]" />;
    if (t.includes('dispute')) return <AlertTriangle className="w-5 h-5 text-[#b51822]" />;
    if (t.includes('withdraw')) return <DollarSign className="w-5 h-5 text-[#5b403e]" />;
    if (t.includes('review')) return <CheckCircle className="w-5 h-5 text-[#38A169]" />;
    if (t.includes('order')) return <FileText className="w-5 h-5 text-[#3182CE]" />;
    if (t === 'system') return <CheckCircle className="w-5 h-5 text-[#38A169]" />;
    return <Bell className="w-5 h-5 text-[#8f6f6d]" />;
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return 'Hari ini, ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
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
      className={`bg-white rounded border border-[#e5e2e1] p-4 flex gap-4 cursor-pointer transition-colors ${!n.is_read ? 'bg-[#FFF5F5] border-[#FEB2B2]' : 'hover:bg-[#f7f5f4]'}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-white' : 'bg-[#f7f5f4]'}`}>
        {getIcon(n.type)}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm mb-1 ${!n.is_read ? 'font-bold text-[#1c1b1b]' : 'font-semibold text-[#5b403e]'}`}>
          {n.title}
        </h3>
        <p className={`text-sm mb-2 leading-snug ${!n.is_read ? 'text-[#32201f]' : 'text-[#9e8e8c]'}`}>
          {n.body}
        </p>
        <p className="text-[10px] text-[#9e8e8c] font-medium uppercase tracking-wide">
          {formatTime(n.created_at)}
        </p>
      </div>
      {!n.is_read && (
        <div className="shrink-0 pt-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#b51822]" />
        </div>
      )}
    </div>
  );

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      <MobilePageHeader
        title="Notifikasi"
        right={unreadCount > 0 ? (
          <button onClick={handleMarkAllRead} className="text-sm font-semibold text-[#b51822] hover:underline">
            Tandai semua dibaca
          </button>
        ) : undefined}
      />

      <div className="hidden lg:flex max-w-lg mx-auto px-4 pt-8 items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1c1b1b]">Notifikasi</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-sm font-semibold text-[#b51822] hover:underline">
            Tandai semua dibaca
          </button>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === 'all' ? 'bg-[#b51822] text-white' : 'bg-white border border-[#e5e2e1] text-[#5b403e] hover:bg-[#f7f5f4]'}`}
          >
            Semua
          </button>
          <button 
            onClick={() => setActiveFilter('transaction')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === 'transaction' ? 'bg-[#b51822] text-white' : 'bg-white border border-[#e5e2e1] text-[#5b403e] hover:bg-[#f7f5f4]'}`}
          >
            Transaksi
          </button>
          <button 
            onClick={() => setActiveFilter('system')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === 'system' ? 'bg-[#b51822] text-white' : 'bg-white border border-[#e5e2e1] text-[#5b403e] hover:bg-[#f7f5f4]'}`}
          >
            Sistem
          </button>
        </div>
        
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded border border-[#e5e2e1] p-4 flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-[#e5e2e1] shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-[#e5e2e1] rounded w-3/4" />
                  <div className="h-3 bg-[#e5e2e1] rounded w-full" />
                  <div className="h-3 bg-[#e5e2e1] rounded w-1/4 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState icon={Bell} title="Belum Ada Notifikasi" description="Notifikasi pesanan, pembayaran, dan info penting akan muncul di sini." />
        ) : (
          <div className="space-y-5">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                <h2 className="text-xs font-semibold text-[#8f6f6d] uppercase tracking-wide px-1 mb-2">{group.label}</h2>
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

