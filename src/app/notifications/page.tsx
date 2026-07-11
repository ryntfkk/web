"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bell, FileText, CheckCircle, CreditCard, AlertTriangle, DollarSign } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';


interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'order' | 'payment' | 'system' | 'dispute' | 'withdrawal';
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    fetchNotifications();
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/notifications');
    if (res.success && res.data) {
      // Backend may return array directly OR envelope { data: [...] }
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
      // Mark as read locally and API
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      await fetchAPI(`/notifications/${n.id}/read`, { method: 'PUT' });
    }
    
    if (n.reference_id) {
      if (n.type === 'order' || n.type === 'dispute') {
        router.push(`/orders/${n.reference_id}`);
      } else if (n.type === 'payment') {
        router.push(`/payment/${n.reference_id}`);
      } else if (n.type === 'withdrawal') {
        router.push(`/mitra/wallet`); // or profile/wallet depending on active role
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <FileText className="w-5 h-5 text-[#3182CE]" />;
      case 'payment': return <CreditCard className="w-5 h-5 text-[#DD6B20]" />;
      case 'system': return <CheckCircle className="w-5 h-5 text-[#38A169]" />;
      case 'dispute': return <AlertTriangle className="w-5 h-5 text-[#b51822]" />;
      case 'withdrawal': return <DollarSign className="w-5 h-5 text-[#5b403e]" />;
      default: return <Bell className="w-5 h-5 text-[#8f6f6d]" />;
    }
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    
    // If today, show time. Otherwise show date
    if (date.toDateString() === now.toDateString()) {
      return 'Hari ini, ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-16 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </Link>
            <h1 className="text-base font-bold text-[#1c1b1b]">Notifikasi</h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-sm font-semibold text-[#b51822] hover:underline">
              Tandai semua dibaca
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded border border-[#e5e2e1] p-4 flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-[#e5e2e1] shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-[#e5e2e1] rounded w-3/4" />
                <div className="h-3 bg-[#e5e2e1] rounded w-full" />
                <div className="h-3 bg-[#e5e2e1] rounded w-1/4 mt-2" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-10">
            <Bell className="w-12 h-12 text-[#e5e2e1] mx-auto mb-3" />
            <p className="text-sm text-[#5b403e]">Belum ada notifikasi.</p>
          </div>
        ) : (
          notifications.map(n => (
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
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}

