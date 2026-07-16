"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Calendar, MessageSquare,
  Star, AlertTriangle, Phone, User, Clock, CheckCircle2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { fetchAPI } from '@/lib/api';
import { csWhatsAppUrl } from '@/lib/constants';
import { getErrorMessage } from '@/types/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


interface OrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  scheduled_at: string;
  payment_expired_at?: string;
  confirmation_expired_at?: string;
  additional_fee_expired_at?: string;
  service_address?: string;
  notes?: string;
  photos?: string[];
  partner?: {
    id: string;
    user_id?: string;
    name: string;
    username: string;
    avatar_url?: string;
    rating?: number;
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
    unit_price: number;
    quantity: number;
    total: number;
  };
  review?: {
    id: string;
    rating: number;
    comment?: string;
  };
  dispute_reason?: string;
  cancellation_reason?: string;
  transport_fee?: number;
  promo_discount?: number;
}

function formatPrice(p: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OrderDetailClient() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleChat = async () => {
    if (!order) return;
    setIsChatLoading(true);
    try {
      const res = await fetchAPI<any>('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({ partner_id: order.partner?.user_id }),
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

  useEffect(() => {
    if (!isAuthorized || !orderId) return;
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    const res = await fetchAPI<{ data: OrderDetail }>(`/orders/${orderId}`);
    if (res.success && res.data) {
      setOrder((res.data as any).data ?? res.data);
    }
    setLoading(false);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (action: string, body?: object) => {
    setActionLoading(true);
    const res = await fetchAPI(`/orders/${orderId}/${action}`, { method: 'PUT', body: JSON.stringify(body ?? {}) });
    if (res.success) {
      showToast('Berhasil!');
      await fetchOrder();
    } else {
      showToast(getErrorMessage(res), 'error');
    }
    setActionLoading(false);
  };

  const [cancelReason, setCancelReason] = useState('');

  const handleCancel = async () => {
    if (!cancelReason) {
      showToast('Harap pilih alasan pembatalan', 'error');
      return;
    }
    setShowCancelDialog(false);
    await handleAction('cancel', { reason: cancelReason });
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  if (loading) {
    return (
      <div className="page-h bg-[#f7f5f4] pb-20">
        <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 lg:hidden">
          <div className="h-6 w-40 bg-[#e5e2e1] rounded animate-pulse" />
        </div>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded border border-[#e5e2e1] p-4 animate-pulse">
              <div className="h-4 w-3/4 bg-[#e5e2e1] rounded mb-3" />
              <div className="h-4 w-1/2 bg-[#e5e2e1] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#5b403e] mb-4">Pesanan tidak ditemukan.</p>
          <Button onClick={() => router.push('/orders')}>Kembali ke Pesanan</Button>
        </div>
      </div>
    );
  }

  const status = order.status;

  return (
    <>
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-[#38A169]' : 'bg-[#E53E3E]'}`}>
          {toast.message}
        </div>
      )}

      {/* Header khusus mobile — di desktop TopNavbar sudah jadi satu-satunya header. */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 sticky top-0 z-10 lg:hidden">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[#1c1b1b]">Detail Pesanan</h1>
            <p className="text-xs text-[#9e8e8c]">{order.order_number}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-[#1c1b1b]">Detail Pesanan</h1>
          <p className="text-sm text-[#9e8e8c] mt-1">{order.order_number}</p>
        </div>

        {/* Status & Countdown */}
        <div className="bg-white rounded border border-[#e5e2e1] p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <StatusBadge status={status} size="md" />
            {status === 'WAITING_PAYMENT' && order.payment_expired_at && (
              <CountdownTimer
                targetDate={order.payment_expired_at}
                format="mm:ss"
                criticalThresholdSeconds={300}
                onExpire={fetchOrder}
              />
            )}
            {status === 'WAITING_CONFIRMATION' && (
              <span className="text-xs text-[#5b403e]">Menunggu konfirmasi mitra</span>
            )}
            {status === 'WAITING_CUSTOMER_CONFIRM' && order.confirmation_expired_at && (
              <CountdownTimer
                targetDate={order.confirmation_expired_at}
                format="hh:mm:ss"
                criticalThresholdSeconds={7200}
                warningThresholdSeconds={43200}
                onExpire={fetchOrder}
              />
            )}
            {status === 'WAITING_ADDITIONAL_PAY' && order.additional_fee_expired_at && (
              <CountdownTimer
                targetDate={order.additional_fee_expired_at}
                format="mm:ss"
                criticalThresholdSeconds={300}
                onExpire={fetchOrder}
              />
            )}
          </div>

          {/* State-specific info banners */}
          {status === 'PAID' && (
            <div className="mt-3 p-3 bg-[#EBF8FF] border-l-4 border-[#3182CE] rounded text-sm text-[#5b403e]">
              Pembayaran berhasil. Menunggu Mitra tiba dan memulai pekerjaan sesuai jadwal.
            </div>
          )}
          {status === 'WAITING_CUSTOMER_CONFIRM' && (
            <div className="mt-3 p-3 bg-[#fff8f2] border-l-4 border-[#DD6B20] rounded text-sm text-[#5b403e]">
              Mitra telah menyelesaikan pekerjaan. Konfirmasi jika sudah sesuai untuk mencairkan dana ke mitra.
              Jika tidak dikonfirmasi dalam 24 jam, dana akan otomatis dicairkan.
            </div>
          )}
          {status === 'DISPUTED' && (
            <div className="mt-3 p-3 bg-[#FFF5F5] border-l-4 border-[#E53E3E] rounded text-sm text-[#5b403e]">
              🔒 Dana escrow dibekukan hingga sengketa diselesaikan oleh Tim CS (maks. 3×24 jam).
            </div>
          )}
          {status === 'CANCELLED' && order.cancellation_reason && (
            <div className="mt-3 p-3 bg-[#f7f5f4] rounded text-sm text-[#5b403e]">
              Alasan pembatalan: {order.cancellation_reason}
            </div>
          )}
        </div>

        {/* Partner Info */}
        {order.partner && (
          <div className="bg-white rounded border border-[#e5e2e1] p-4">
            <h2 className="text-sm font-semibold text-[#9e8e8c] uppercase tracking-wide mb-3">Mitra</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#e5e2e1] flex items-center justify-center text-lg font-bold text-[#5b403e] overflow-hidden shrink-0">
                {order.partner.avatar_url
                  ? <img src={order.partner.avatar_url} alt={order.partner.name} className="w-full h-full object-cover" />
                  : order.partner.name.charAt(0).toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1c1b1b]">{order.partner.name}</p>
                {order.partner.rating && (
                  <div className="flex items-center gap-1 text-sm text-[#5b403e]">
                    <Star className="w-3.5 h-3.5 fill-[#D69E2E] text-[#D69E2E]" />
                    <span>{order.partner.rating.toFixed(1)}</span>
                  </div>
                )}
                {order.partner.phone_masked && (
                  <p className="text-xs text-[#9e8e8c] flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {order.partner.phone_masked}
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

        {/* Services & Price */}
        <div className="bg-white rounded border border-[#e5e2e1] p-4">
          <h2 className="text-sm font-semibold text-[#9e8e8c] uppercase tracking-wide mb-3">Detail Layanan</h2>
          <div className="space-y-2">
            {order.items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#1c1b1b]">
                  {item.service_name}
                  {item.quantity > 1 && <span className="text-[#9e8e8c]"> x{item.quantity}</span>}
                </span>
                <span className="font-semibold text-[#1c1b1b]">{formatPrice(item.price * (item.quantity || 1))}</span>
              </div>
            ))}
          </div>
          {(order.transport_fee !== undefined || order.promo_discount) && (
            <div className="mt-3 pt-3 border-t border-[#e5e2e1] space-y-1.5 text-sm">
              {order.transport_fee !== undefined && (
                <div className="flex justify-between text-[#5b403e]">
                  <span>Biaya Transport</span>
                  <span>{order.transport_fee === 0 ? 'Gratis' : formatPrice(order.transport_fee)}</span>
                </div>
              )}
              {order.promo_discount !== undefined && order.promo_discount > 0 && (
                <div className="flex justify-between text-[#38A169]">
                  <span>Diskon Promo</span>
                  <span>- {formatPrice(order.promo_discount)}</span>
                </div>
              )}
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
            <span className="text-[#1c1b1b]">Total</span>
            <span className="text-[#b51822]">{formatPrice(order.total_amount)}</span>
          </div>
        </div>

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
                  <img
                    key={i}
                    src={photo}
                    alt={`Foto ${i + 1}`}
                    className="w-20 h-20 object-cover rounded border border-[#e5e2e1]"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Existing Review */}
        {order.review && (
          <div className="bg-white rounded border border-[#e5e2e1] p-4">
            <h2 className="text-sm font-semibold text-[#9e8e8c] uppercase tracking-wide mb-3">Ulasan Anda</h2>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= order.review!.rating ? 'fill-[#D69E2E] text-[#D69E2E]' : 'text-[#e5e2e1]'}`} />
              ))}
              <span className="text-sm text-[#5b403e] ml-1">{order.review.rating}/5</span>
            </div>
            {order.review.comment && <p className="text-sm text-[#1c1b1b]">"{order.review.comment}"</p>}
          </div>
        )}

      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          {/* WAITING_CONFIRMATION */}
          {status === 'WAITING_CONFIRMATION' && (
            <Button
              variant="outline"
              className="flex-1 border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded"
              onClick={() => setShowCancelDialog(true)}
              disabled={actionLoading}
            >
              Batalkan Pesanan
            </Button>
          )}

          {/* WAITING_PAYMENT → arahkan ke halaman Pembayaran (satu-satunya pintu bayar) */}
          {status === 'WAITING_PAYMENT' && (
            <Button
              className="flex-1 bg-[#b51822] hover:bg-[#90121a] rounded"
              onClick={() => router.push(`/payment/${orderId}`)}
            >
              Bayar Sekarang
            </Button>
          )}

          {/* PAID */}
          {status === 'PAID' && (
            <Button
              variant="outline"
              className="flex-1 border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded"
              onClick={() => setShowCancelDialog(true)}
              disabled={actionLoading}
            >
              Batalkan Pesanan
            </Button>
          )}

          {/* IN_PROGRESS */}
          {status === 'IN_PROGRESS' && (
            <Button
              variant="outline"
              className="flex-1 border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded"
              onClick={() => router.push(`/orders/${order.id}/dispute`)}
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" /> Lapor Masalah
            </Button>
          )}

          {/* WAITING_ADDITIONAL_PAY */}
          {status === 'WAITING_ADDITIONAL_PAY' && (
            <Button
              className="flex-1 bg-[#b51822] hover:bg-[#90121a] rounded"
              onClick={() => router.push(`/orders/${order.id}/additional-fee`)}
            >
              Lihat Detail Tagihan
            </Button>
          )}

          {/* WAITING_CUSTOMER_CONFIRM */}
          {status === 'WAITING_CUSTOMER_CONFIRM' && (
            <>
              <Button
                variant="outline"
                className="flex-1 border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded"
                onClick={() => router.push(`/orders/${order.id}/dispute`)}
              >
                Lapor Masalah
              </Button>
              <Button
                className="flex-1 bg-[#38A169] hover:bg-[#2F855A] rounded"
                onClick={() => handleAction('finish')}
                disabled={actionLoading}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Konfirmasi Selesai
              </Button>
            </>
          )}

          {/* COMPLETED — tambahkan link ke ulasan jika belum ada */}
          {status === 'COMPLETED' && !order.review && (
            <Button
              className="flex-1 bg-[#b51822] hover:bg-[#90121a] rounded"
              onClick={() => router.push(`/orders/${order.id}/review`)}
            >
              <Star className="w-4 h-4 mr-1.5" /> Beri Ulasan
            </Button>
          )}

          {/* DISPUTED */}
          {status === 'DISPUTED' && (
            <Button
              className="flex-1 bg-[#25D366] hover:bg-[#128C7E] rounded"
              onClick={() => window.open(csWhatsAppUrl(`Halo CS Posko Jasa. Saya melaporkan masalah pada Pesanan #${order.order_number}.`), '_blank')}
            >
              Hubungi CS via WhatsApp
            </Button>
          )}

          {/* Chat always visible if partner exists */}
          {order.partner && (status === 'PAID' || status === 'IN_PROGRESS' || status === 'WAITING_CUSTOMER_CONFIRM' || status === 'WAITING_ADDITIONAL_PAY') && (
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

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1c1b1b]">Batalkan Pesanan?</h3>
              <button onClick={() => setShowCancelDialog(false)}>
                <X className="w-5 h-5 text-[#9e8e8c]" />
              </button>
            </div>
            <p className="text-sm text-[#5b403e] mb-4">
              {status === 'WAITING_CONFIRMATION' 
                ? 'Pesanan akan dibatalkan. Anda belum dikenakan biaya apapun.' 
                : 'Pesanan akan dibatalkan dan tidak dapat dikembalikan. Biaya layanan yang sudah dibayar akan dikembalikan ke saldo dompet Anda.'}
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#1c1b1b] mb-1">Alasan Pembatalan</label>
              <select 
                className="w-full px-3 py-2 border border-[#e5e2e1] rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="">Pilih alasan...</option>
                <option value="Berubah pikiran">Berubah pikiran</option>
                <option value="Jadwal tidak cocok">Jadwal tidak cocok</option>
                <option value="Menemukan mitra lain">Menemukan mitra lain</option>
                <option value="Mitra tidak merespon">Mitra tidak merespon</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded border-[#e5e2e1]" onClick={() => setShowCancelDialog(false)}>
                Batal
              </Button>
              <Button className="flex-1 bg-[#E53E3E] hover:bg-[#C53030] rounded" onClick={handleCancel} disabled={actionLoading}>
                {actionLoading ? 'Memproses...' : 'Ya, Batalkan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
