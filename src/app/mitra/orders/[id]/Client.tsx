"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, MapPin, Calendar, Clock, Phone, Loader2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { csWhatsAppUrl } from '@/lib/constants';
import { getErrorMessage } from '@/types/api';


// Bentuk field mengikuti OrderDetailDTO di backend (internal/order/dto.go).
interface MitraOrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  // Pendapatan mitra setelah potongan platform — bukan total_amount, yang
  // merupakan jumlah yang dibayar pelanggan.
  partner_amount?: number;
  platform_fee?: number;
  partner_amount_estimated?: boolean;
  scheduled_at: string;
  confirmation_expired_at?: string;
  total_service_price?: number;
  promo_discount?: number;
  admin_fee?: number;
  service_address?: string;
  address_detail?: string;
  notes?: string;
  photos?: string[];
  customer_info?: {
    id: string;
    name: string;
    phone?: string;
  };
  items?: {
    id: string;
    service_name: string;
    price: number;
    quantity: number;
  }[];
  additional_fees?: {
    id: string;
    type: string;
    item_name: string;
    price: number;
    quantity: number;
    total: number;
    status: 'PENDING' | 'PAID' | 'REJECTED';
  }[];
  transport_fee?: number;
}

const ADDITIONAL_FEE_LABEL: Record<string, string> = {
  PENDING: 'Menunggu pembayaran pelanggan',
  PAID: 'Sudah dibayar',
  REJECTED: 'Ditolak pelanggan',
};

// Backend mengirim nomor telepon apa adanya; disamarkan di sini agar tidak
// tampil utuh pada layar mitra (mis. 0811****333).
const maskPhone = (phone?: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\s+/g, '');
  if (digits.length <= 7) return digits;
  return `${digits.slice(0, 4)}${'*'.repeat(digits.length - 7)}${digits.slice(-3)}`;
};

export default function MitraOrderDetailClient() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<MitraOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [disputeReason, setDisputeReason] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !orderId) return;
    fetchOrder();
  }, [isAuthenticated, user?.active_role, orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    const res = await fetchAPI<any>(`/orders/${orderId}`);
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
        body: JSON.stringify({ customer_id: order.customer_info?.id }),
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
    let res;
    
    if (action === 'reject') {
      res = await fetchAPI(`/orders/${orderId}/reject`, { method: 'PUT', body: JSON.stringify({ reason: rejectReason }) });
    } else if (action === 'dispute') {
      res = await fetchAPI(`/orders/${orderId}/dispute`, { method: 'PUT', body: JSON.stringify({ reason: disputeReason }) });
    } else {
      res = await fetchAPI(`/orders/${orderId}/${action}`, { method: 'PUT', body: JSON.stringify(body ?? {}) });
    }

    if (res.success) {
      showToast('Berhasil!');
      if (action === 'accept' || action === 'confirm') setShowAcceptModal(false);
      if (action === 'reject') setShowRejectModal(false);
      if (action === 'dispute') setShowDisputeModal(false);
      await fetchOrder();
    } else {
      showToast(getErrorMessage(res), 'error');
    }
    setActionLoading(false);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  if (loading) {
    return (
      <div className="page-h bg-[#f7f5f4] pb-20 flex justify-center pt-10">
        <div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#5b403e] mb-4">Pesanan tidak ditemukan.</p>
          <Button onClick={() => router.push('/mitra/orders')}>Kembali ke Daftar</Button>
        </div>
      </div>
    );
  }

  const status = order.status;

  return (
    <div className="page-h bg-[#f7f5f4] pb-40">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-[#38A169]' : 'bg-[#E53E3E]'}`}>
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
        {order.customer_info && (
          <div className="bg-white rounded border border-[#e5e2e1] p-4">
            <h2 className="text-sm font-semibold text-[#9e8e8c] uppercase tracking-wide mb-3">Pemesan</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#e5e2e1] flex items-center justify-center text-lg font-bold text-[#5b403e] shrink-0">
                {order.customer_info.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1c1b1b]">{order.customer_info.name}</p>
                {order.customer_info.phone && (
                  <p className="text-xs text-[#9e8e8c] flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {maskPhone(order.customer_info.phone)}
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
          
          {/* === Item Layanan === */}
          <div className="space-y-2">
            {order.items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#1c1b1b]">
                  {item.service_name}
                  {item.quantity > 1 && (
                    <span className="text-[#9e8e8c] ml-1">× {item.quantity}</span>
                  )}
                </span>
                <span className="font-semibold text-[#1c1b1b]">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          
          {/* === Subtotal Jasa === */}
          {order.total_service_price !== undefined && (
            <div className="mt-2 flex justify-between text-sm text-[#5b403e] border-t border-dashed border-[#e5e2e1] pt-2">
              <span>Subtotal Jasa</span>
              <span>{formatPrice(order.total_service_price)}</span>
            </div>
          )}
          
          {/* === Diskon Promo === */}
          {order.promo_discount !== undefined && order.promo_discount > 0 && (
            <div className="mt-1 flex justify-between text-sm text-[#38A169]">
              <span>Diskon Promo</span>
              <span>- {formatPrice(order.promo_discount)}</span>
            </div>
          )}
          
          {/* === Transport Fee === */}
          {order.transport_fee !== undefined && (
            <div className="mt-1 flex justify-between text-sm text-[#5b403e]">
              <span>Biaya Transport</span>
              <span>{order.transport_fee === 0 ? 'Gratis' : formatPrice(order.transport_fee)}</span>
            </div>
          )}
          
          {/* === Admin Fee (informasi saja, bukan pendapatan mitra) === */}
          {order.admin_fee !== undefined && order.admin_fee > 0 && (
            <div className="mt-1 flex justify-between text-sm text-[#9e8e8c]">
              <span className="italic">Biaya Admin (ditanggung pelanggan)</span>
              <span className="italic">{formatPrice(order.admin_fee)}</span>
            </div>
          )}
          
          {/* === Total Dibayar Pelanggan === */}
          <div className="mt-2 pt-2 border-t border-[#e5e2e1] flex justify-between text-sm font-medium text-[#5b403e]">
            <span>Total Dibayar Pelanggan</span>
            <span>{formatPrice(order.total_amount)}</span>
          </div>
          
          {/* === Biaya Tambahan (dipisah per status) === */}
          {order.additional_fees && order.additional_fees.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#e5e2e1] space-y-2">
              <p className="text-xs font-semibold text-[#9e8e8c] uppercase tracking-wide">Biaya Tambahan</p>
              {order.additional_fees.map(fee => (
                <div key={fee.id} className="flex justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${
                      fee.status === 'REJECTED' ? 'text-[#9e8e8c] line-through' :
                      fee.status === 'PENDING' ? 'text-[#DD6B20]' : 'text-[#1c1b1b]'
                    }`}>
                      {fee.item_name}
                      <span className="ml-1 text-xs font-normal">
                        ({fee.quantity}× {formatPrice(fee.price)})
                      </span>
                    </p>
                    <p className="text-xs text-[#9e8e8c]">
                      {ADDITIONAL_FEE_LABEL[fee.status] ?? fee.status}
                    </p>
                  </div>
                  <span className={`font-medium shrink-0 ${
                    fee.status === 'REJECTED' ? 'text-[#9e8e8c] line-through' :
                    fee.status === 'PENDING' ? 'text-[#DD6B20]' : 'text-[#1c1b1b]'
                  }`}>
                    + {formatPrice(fee.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {/* === SEPARATOR: Breakdown Pendapatan Mitra === */}
          <div className="mt-3 pt-3 border-t-2 border-[#e5e2e1]">
            <p className="text-xs font-semibold text-[#9e8e8c] uppercase tracking-wide mb-2">
              Rincian Pendapatan Mitra
            </p>
            
            {/* Komisi Platform */}
            {order.platform_fee !== undefined && order.platform_fee > 0 && (
              <div className="flex justify-between text-sm text-[#E53E3E]">
                <span>Komisi Platform (12%)</span>
                <span>- {formatPrice(order.platform_fee)}</span>
              </div>
            )}
            
            {/* TOTAL PENDAPATAN MITRA — BOLD, merah */}
            <div className="mt-2 flex justify-between font-bold text-base">
              <span className="text-[#1c1b1b]">
                {order.status === 'COMPLETED' ? 'Pendapatan Bersih' : 'Estimasi Pendapatan'}
              </span>
              <span className="text-[#b51822]">
                {formatPrice(order.partner_amount ?? order.total_amount)}
              </span>
            </div>
            
            {/* Info estimasi */}
            {order.partner_amount_estimated && (
              <p className="mt-1 text-xs text-[#9e8e8c]">
                ⓘ Angka estimasi — akan dikonfirmasi saat pesanan selesai.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar — hanya dirender bila ada aksi untuk status ini,
          agar tidak muncul bar putih kosong pada pesanan selesai/batal/ditolak. */}
      {['WAITING_CONFIRMATION', 'PAID', 'IN_PROGRESS', 'WAITING_CUSTOMER_CONFIRM', 'DISPUTED', 'WAITING_ADDITIONAL_PAY'].includes(status as string) && (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-20">
        {/* Kolom, bukan baris: tiap status menyusun barisnya sendiri sehingga
            tombol tidak pernah berebut ruang di baris yang sama.
            Aksi Chat tidak diulang di sini — sudah tersedia pada kartu "Pemesan". */}
        <div className="max-w-lg mx-auto flex flex-col gap-2">

          {status === 'WAITING_CONFIRMATION' && (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>Tolak</Button>
              <Button className="flex-1 bg-[#38A169] hover:bg-[#2F855A] rounded" onClick={() => setShowAcceptModal(true)} disabled={actionLoading}>Terima</Button>
            </div>
          )}

          {status === 'PAID' && (
            <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => handleAction('start')} disabled={actionLoading}>
              Mulai Kerjakan
            </Button>
          )}

          {status === 'IN_PROGRESS' && (
            <>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-[#e5e2e1] text-[#5b403e] rounded flex items-center justify-center gap-1" onClick={() => router.push(`/mitra/orders/${order.id}/additional-fee`)} disabled={actionLoading}>
                  + Biaya Tambahan
                </Button>
                <Button className="flex-1 bg-[#38A169] hover:bg-[#2F855A] rounded" onClick={() => handleAction('complete')} disabled={actionLoading}>
                  Selesai
                </Button>
              </div>
              <Button variant="outline" className="w-full border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded flex items-center justify-center gap-2" onClick={() => setShowDisputeModal(true)} disabled={actionLoading}>
                <AlertTriangle className="w-4 h-4" /> Lapor Masalah
              </Button>
            </>
          )}

          {status === 'WAITING_ADDITIONAL_PAY' && (
            <Button variant="outline" className="w-full border-[#e5e2e1] text-[#5b403e] rounded" disabled>
              Menunggu Pembayaran Biaya Tambahan
            </Button>
          )}

          {status === 'WAITING_CUSTOMER_CONFIRM' && (
            <Button variant="outline" className="w-full border-[#e5e2e1] text-[#5b403e] rounded" disabled>
              Menunggu Konfirmasi Pelanggan
            </Button>
          )}

          {status === 'DISPUTED' && (
            <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] rounded flex items-center justify-center gap-2" onClick={() => window.open(csWhatsAppUrl(`Halo CS Posko Jasa. Saya mitra untuk Pesanan #${order.order_number}.`), '_blank')}>
              Hubungi CS via WhatsApp
            </Button>
          )}
        </div>
      </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-[#1c1b1b] mb-2">Terima Pesanan?</h3>
            <p className="text-sm text-[#5b403e] mb-6">Pastikan Anda siap mengerjakan pesanan sesuai jadwal dan harga yang disepakati.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-[#e5e2e1] text-[#5b403e]" onClick={() => setShowAcceptModal(false)} disabled={actionLoading}>Batal</Button>
              <Button className="flex-1 bg-[#38A169] hover:bg-[#2F855A]" onClick={() => handleAction('confirm')} disabled={actionLoading}>Ya, Terima</Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-xl p-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#1c1b1b]">Tolak Pesanan</h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-[#9e8e8c]" />
              </button>
            </div>
            <p className="text-sm text-[#5b403e] mb-4">Silakan pilih alasan penolakan. Ini membantu kami meningkatkan kualitas layanan.</p>
            
            <div className="space-y-2 mb-6">
              {['Harga tidak sesuai', 'Jadwal bentrok', 'Di luar area layanan', 'Lainnya'].map(reason => (
                <button 
                  key={reason}
                  className={`w-full text-left px-4 py-3 border rounded-lg text-sm transition-colors ${rejectReason === reason ? 'border-[#b51822] bg-red-50 text-[#b51822] font-medium' : 'border-[#e5e2e1] text-[#1c1b1b] hover:border-gray-300'}`}
                  onClick={() => setRejectReason(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>

            <Button 
              className="w-full bg-[#E53E3E] hover:bg-[#C53030]" 
              disabled={!rejectReason || actionLoading}
              onClick={() => handleAction('reject', { reason: rejectReason })}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Konfirmasi Tolak'}
            </Button>
          </div>
        </div>
      )}
      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-xl p-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#1c1b1b]">Lapor Masalah</h3>
              <button onClick={() => setShowDisputeModal(false)} className="p-2 -mr-2 text-[#9e8e8c] hover:text-[#5b403e]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-sm text-[#5b403e]">Pesanan akan dihentikan sementara (Dispute) dan tim CS akan menengahinya. Berikan alasan masalah Anda:</p>
              
              <textarea 
                className="w-full border border-[#e5e2e1] rounded-lg p-3 text-sm focus:outline-none focus:border-[#b51822]"
                placeholder="Tuliskan kendala Anda secara detail..."
                rows={4}
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
              />
            </div>
            
            <Button 
              className="w-full bg-[#E53E3E] hover:bg-[#C53030] text-white rounded-xl h-12 font-bold"
              disabled={!disputeReason.trim() || actionLoading}
              onClick={() => handleAction('dispute')}
            >
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Kirim Laporan'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
