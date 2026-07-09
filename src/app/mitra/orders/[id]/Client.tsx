"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Calendar, MessageSquare,
  AlertTriangle, Phone, CheckCircle2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';
import { ROLE_PARTNER } from '@/lib/constants';


interface MitraOrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  scheduled_at: string;
  confirmation_expired_at?: string;
  service_address?: string;
  notes?: string;
  photos?: string[];
  customer?: {
    id: string;
    name: string;
    phone_masked?: string;
  };
  items?: {
    id: string;
    service_name: string;
    price: number;
    quantity: number;
  }[];
  additional_fee?: {
    id: string;
    type: string;
    item_name: string;
    total: number;
  };
  transport_fee?: number;
}

export default function MitraOrderDetailClient() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth(ROLE_PARTNER);
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<MitraOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    
    
    fetchOrder();
  }, [isAuthenticated, user?.active_role, orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    const res = await fetchAPI<any>(`/mitra/orders/${orderId}`);
    if (res.success && res.data) {
      setOrder((res.data as any).data ?? res.data);
    }
    setLoading(false);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleChat = async () => {
    if (!order) return;
    setIsChatLoading(true);
    try {
      const res = await fetchAPI<any>('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({ target_user_id: order.customer.id }),
      });
      if (res.success && res.data?.room_id) {
        router.push(`/chat/${res.data.room_id}`);
      } else {
        showToast('Gagal memulai obrolan', 'error');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
      showToast('Terjadi kesalahan saat memulai obrolan', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAction = async (action: string, body?: object) => {
    setActionLoading(true);
    const res = await fetchAPI(`/orders/${orderId}/${action}`, { method: 'PUT', body: JSON.stringify(body ?? {}) });
    if (res.success) {
      showToast('Berhasil!');
      await fetchOrder();
    } else {
      showToast(res.message || 'Terjadi kesalahan', 'error');
    }
    setActionLoading(false);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f5f4] pb-20 flex justify-center pt-10">
        <div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f7f5f4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#5b403e] mb-4">Pesanan tidak ditemukan.</p>
          <Button onClick={() => router.push('/mitra/orders')}>Kembali ke Daftar</Button>
        </div>
      </div>
    );
  }

  const status = order.status;

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-[#38A169]' : 'bg-[#E53E3E]'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[#1c1b1b]">Detail Pesanan</h1>
            <p className="text-xs text-[#9e8e8c]">#{order.order_number}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Status */}
        <div className="bg-white rounded border border-[#e5e2e1] p-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={status} size="md" />
            {status === 'WAITING_CONFIRMATION' && order.confirmation_expired_at && (
              <CountdownTimer targetDate={order.confirmation_expired_at} format="mm:ss" criticalThresholdSeconds={300} onExpire={fetchOrder} />
            )}
          </div>
          
          {status === 'WAITING_CONFIRMATION' && (
            <div className="mt-3 p-3 bg-[#fff8f2] border-l-4 border-[#DD6B20] rounded text-sm text-[#5b403e]">
              Segera konfirmasi pesanan ini sebelum batas waktu habis agar tidak batal otomatis.
            </div>
          )}
        </div>

        {/* Customer Info */}
        {order.customer && (
          <div className="bg-white rounded border border-[#e5e2e1] p-4">
            <h2 className="text-sm font-semibold text-[#9e8e8c] uppercase tracking-wide mb-3">Pemesan</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#e5e2e1] flex items-center justify-center text-lg font-bold text-[#5b403e] shrink-0">
                {order.customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1c1b1b]">{order.customer.name}</p>
                {order.customer.phone_masked && (
                  <p className="text-xs text-[#9e8e8c] flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {order.customer.phone_masked}
                  </p>
                )}
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1 text-xs border-[#e5e2e1] text-[#5b403e] rounded"
                onClick={handleChat}
                disabled={isChatLoading}
              >
                {isChatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                Chat
              </Button>
            </div>
          </div>
        )}

        {/* Schedule & Address */}
        <div className="bg-white rounded border border-[#e5e2e1] p-4">
          <h2 className="text-sm font-semibold text-[#9e8e8c] uppercase tracking-wide mb-3">Jadwal & Lokasi</h2>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 text-sm">
              <Calendar className="w-4 h-4 text-[#b51822] mt-0.5 shrink-0" />
              <span className="text-[#1c1b1b]">{formatDate(order.scheduled_at)}</span>
            </div>
            {order.service_address && (
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin className="w-4 h-4 text-[#b51822] mt-0.5 shrink-0" />
                <span className="text-[#5b403e]">{order.service_address}</span>
              </div>
            )}
          </div>
          {order.notes && (
            <div className="mt-3 pt-3 border-t border-[#e5e2e1]">
              <p className="text-xs text-[#9e8e8c] mb-1">Catatan</p>
              <p className="text-sm text-[#1c1b1b]">{order.notes}</p>
            </div>
          )}
          {order.photos && order.photos.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#e5e2e1]">
              <p className="text-xs text-[#9e8e8c] mb-2">Foto Pesanan</p>
              <div className="flex gap-2 flex-wrap">
                {order.photos.map((photo, i) => (
                  <img key={i} src={photo} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded border border-[#e5e2e1]" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Services & Price */}
        <div className="bg-white rounded border border-[#e5e2e1] p-4">
          <h2 className="text-sm font-semibold text-[#9e8e8c] uppercase tracking-wide mb-3">Detail Biaya</h2>
          <div className="space-y-2">
            {order.items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#1c1b1b]">{item.service_name}</span>
                <span className="font-semibold text-[#1c1b1b]">{formatPrice(item.price)}</span>
              </div>
            ))}
          </div>
          {order.transport_fee !== undefined && (
            <div className="mt-2 flex justify-between text-sm text-[#5b403e]">
              <span>Biaya Transport</span>
              <span>{order.transport_fee === 0 ? 'Gratis' : formatPrice(order.transport_fee)}</span>
            </div>
          )}
          {order.additional_fee && (
            <div className="mt-3 pt-3 border-t border-[#e5e2e1]">
              <div className="flex justify-between text-sm text-[#DD6B20] font-medium">
                <span>Biaya Tambahan ({order.additional_fee.item_name})</span>
                <span>+ {formatPrice(order.additional_fee.total)}</span>
              </div>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-[#e5e2e1] flex justify-between font-bold text-base">
            <span className="text-[#1c1b1b]">Total Pendapatan (estimasi)</span>
            <span className="text-[#b51822]">{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-20">
        <div className="max-w-lg mx-auto flex gap-3">
          
          {status === 'WAITING_CONFIRMATION' && (
            <>
              <Button variant="outline" className="flex-1 border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded" onClick={() => handleAction('reject')} disabled={actionLoading}>Tolak</Button>
              <Button className="flex-1 bg-[#38A169] hover:bg-[#2F855A] rounded" onClick={() => handleAction('confirm')} disabled={actionLoading}>Terima</Button>
            </>
          )}

          {status === 'PAID' && (
            <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => handleAction('start')} disabled={actionLoading}>
              Mulai Kerjakan
            </Button>
          )}

          {status === 'IN_PROGRESS' && (
            <>
              <Button variant="outline" className="flex-1 border-[#e5e2e1] text-[#5b403e] rounded flex items-center justify-center gap-1" onClick={() => router.push(`/mitra/orders/${order.id}/additional-fee`)}>
                + Biaya Tambahan
              </Button>
              <Button className="flex-1 bg-[#38A169] hover:bg-[#2F855A] rounded" onClick={() => handleAction('complete')} disabled={actionLoading}>
                Selesai Dikerjakan
              </Button>
            </>
          )}

          {status === 'WAITING_CUSTOMER_CONFIRM' && (
            <Button variant="outline" className="w-full border-[#e5e2e1] text-[#5b403e] rounded" disabled>
              Menunggu Konfirmasi Pelanggan
            </Button>
          )}

          {status === 'DISPUTED' && (
            <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] rounded flex items-center justify-center gap-2" onClick={() => window.open('https://wa.me/6281234567890?text=Halo CS', '_blank')}>
              Hubungi CS via WhatsApp
            </Button>
          )}

          {/* Chat always visible */}
          {(status === 'PAID' || status === 'IN_PROGRESS' || status === 'WAITING_ADDITIONAL_PAY') && (
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1 shrink-0"
              onClick={handleChat}
              disabled={isChatLoading}
            >
              {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              Chat
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
