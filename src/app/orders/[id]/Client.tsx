"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Calendar, MessageSquare, Star, AlertTriangle,
  Phone, CheckCircle2, X, Copy, Check, ChevronRight, Clock,
  ClipboardList, Wallet, ShieldCheck, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { fetchAPI } from '@/lib/api';
import { csWhatsAppUrl } from '@/lib/constants';
import { getErrorMessage } from '@/types/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface OrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  total_service_price: number;
  transport_fee: number;
  admin_fee: number;
  promo_discount: number;
  refunded_amount?: number;
  created_at: string;
  scheduled_at: string;
  confirmed_at?: string;
  paid_at?: string;
  started_at?: string;
  completed_at?: string;
  disputed_at?: string;
  payment_expired_at?: string;
  confirmation_expired_at?: string;
  service_address?: string;
  address_detail?: string;
  notes?: string;
  photos?: string[];
  cancellation_reason?: string;
  cancelled_by?: string;
  partner?: {
    id: string;
    user_id?: string;
    name: string;
    username?: string;
    avatar_url?: string;
    phone_masked?: string;
    bio?: string;
    rating?: number;
    total_reviews?: number;
    total_orders?: number;
    is_online?: boolean;
    service_area?: string[];
  };
  items?: {
    id: string;
    service_name: string;
    price: number;
    quantity: number;
    duration?: number;
    photo_url?: string;
  }[];
  additional_fees?: {
    id: string;
    item_name: string;
    type: string;
    price: number;
    quantity: number;
    total: number;
    status: string;
  }[];
  review?: {
    id: string;
    rating: number;
    comment?: string;
    image_urls?: string[];
    created_at: string;
  };
}

function formatPrice(p: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatShort(d: string) {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
}

/** Tampilan hero per status: warna band + kalimat yang menjelaskan
 *  apa yang terjadi dan apa yang harus dilakukan pelanggan. */
const HERO: Record<OrderStatus, { tone: string; title: string; desc: string }> = {
  WAITING_CONFIRMATION: {
    tone: 'from-[#D69E2E] to-[#B7791F]',
    title: 'Menunggu konfirmasi mitra',
    desc: 'Mitra sedang meninjau pesananmu. Kamu belum dikenakan biaya apapun.',
  },
  WAITING_PAYMENT: {
    tone: 'from-[#DD6B20] to-[#B75415]',
    title: 'Selesaikan pembayaran',
    desc: 'Mitra sudah menerima pesananmu. Bayar sebelum waktu habis agar jadwal tidak hangus.',
  },
  PAID: {
    tone: 'from-[#3182CE] to-[#2A6296]',
    title: 'Pembayaran berhasil',
    desc: 'Dana ditahan aman oleh Posko Jasa. Mitra akan datang sesuai jadwal.',
  },
  IN_PROGRESS: {
    tone: 'from-[#805AD5] to-[#5F3DC4]',
    title: 'Mitra sedang bekerja',
    desc: 'Pekerjaan sedang berlangsung. Hubungi mitra lewat chat bila ada yang perlu disampaikan.',
  },
  WAITING_ADDITIONAL_PAY: {
    tone: 'from-[#DD6B20] to-[#B75415]',
    title: 'Ada tagihan tambahan',
    desc: 'Mitra mengajukan biaya tambahan. Tinjau dan setujui agar pekerjaan bisa dilanjutkan.',
  },
  WAITING_CUSTOMER_CONFIRM: {
    tone: 'from-[#5A67D8] to-[#434190]',
    title: 'Pekerjaan selesai — mohon konfirmasi',
    desc: 'Konfirmasi bila hasilnya sudah sesuai. Tanpa konfirmasi, dana cair otomatis ke mitra dalam 24 jam.',
  },
  COMPLETED: {
    tone: 'from-[#38A169] to-[#276749]',
    title: 'Pesanan selesai',
    desc: 'Terima kasih! Ceritakan pengalamanmu lewat ulasan untuk membantu pelanggan lain.',
  },
  CANCELLED: {
    tone: 'from-[#718096] to-[#4A5568]',
    title: 'Pesanan dibatalkan',
    desc: 'Pesanan ini sudah tidak berjalan.',
  },
  DISPUTED: {
    tone: 'from-[#E53E3E] to-[#9B2C2C]',
    title: 'Pesanan dalam sengketa',
    desc: 'Dana escrow dibekukan hingga Tim CS menyelesaikan sengketa (maks. 3×24 jam).',
  },
};

/** Langkah happy-path. Status yang keluar jalur (CANCELLED/DISPUTED)
 *  tidak memakai tracker ini — lihat renderer di bawah. */
const STEPS = ['Dipesan', 'Dikonfirmasi', 'Dibayar', 'Dikerjakan', 'Selesai'] as const;

function currentStep(status: OrderStatus): number {
  switch (status) {
    case 'WAITING_CONFIRMATION': return 0;
    case 'WAITING_PAYMENT': return 1;
    case 'PAID': return 2;
    case 'IN_PROGRESS':
    case 'WAITING_ADDITIONAL_PAY': return 3;
    case 'WAITING_CUSTOMER_CONFIRM': return 4;
    case 'COMPLETED': return 5;
    default: return 0;
  }
}

function Section({ title, icon: Icon, children, className = '' }: {
  title?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-xl border border-[#e5e2e1] p-4 sm:p-5 ${className}`}>
      {title && (
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1c1b1b] mb-3">
          {Icon && <Icon className="w-4 h-4 text-[#b51822]" />}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
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
  const [cancelReason, setCancelReason] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOrder = useCallback(async () => {
    // Beberapa endpoint membungkus payload dua kali ({ data: { data } }),
    // jadi buka satu lapis bila ada.
    const res = await fetchAPI<OrderDetail | { data: OrderDetail }>(`/orders/${orderId}`);
    if (res.success && res.data) {
      const payload = res.data;
      const unwrapped = 'data' in payload && payload.data ? payload.data : (payload as OrderDetail);
      setOrder(unwrapped);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (!isAuthorized || !orderId) return;
    void fetchOrder();
  }, [isAuthorized, orderId, fetchOrder]);

  const handleChat = async () => {
    if (!order?.partner?.user_id) return;
    setIsChatLoading(true);
    try {
      const res = await fetchAPI<{ room_id: string }>('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({ partner_id: order.partner.user_id }),
      });
      if (res.success && res.data?.room_id) {
        router.push(`/chat/${res.data.room_id}`);
      } else {
        showToast('Gagal memulai obrolan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat memulai obrolan', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAction = async (action: string, body?: object) => {
    setActionLoading(true);
    const res = await fetchAPI(`/orders/${orderId}/${action}`, {
      method: 'PUT',
      body: JSON.stringify(body ?? {}),
    });
    if (res.success) {
      showToast('Berhasil!');
      await fetchOrder();
    } else {
      showToast(getErrorMessage(res), 'error');
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelReason) {
      showToast('Harap pilih alasan pembatalan', 'error');
      return;
    }
    setShowCancelDialog(false);
    await handleAction('cancel', { reason: cancelReason });
  };

  const copyOrderNumber = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Gagal menyalin nomor pesanan', 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="page-h flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAuthorized) return null;

  if (loading) {
    return (
      <div className="page-h bg-[#f7f5f4] pb-20">
        <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 lg:hidden">
          <div className="h-6 w-40 bg-[#e5e2e1] rounded animate-pulse" />
        </div>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <div className="h-28 bg-[#e5e2e1] rounded-xl animate-pulse" />
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-[#e5e2e1] p-4 animate-pulse">
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
  const hero = HERO[status] ?? HERO.WAITING_CONFIRMATION;
  const step = currentStep(status);
  const offTrack = status === 'CANCELLED' || status === 'DISPUTED';

  const paidFees = (order.additional_fees ?? []).filter(f => f.status === 'PAID');
  const pendingFees = (order.additional_fees ?? []).filter(f => f.status === 'PENDING');
  const paidFeesTotal = paidFees.reduce((sum, f) => sum + f.total, 0);
  const grandTotal = order.total_amount + paidFeesTotal;

  const timeline = [
    { label: 'Pesanan dibuat', at: order.created_at },
    { label: 'Dikonfirmasi mitra', at: order.confirmed_at },
    { label: 'Pembayaran diterima', at: order.paid_at },
    { label: 'Pekerjaan dimulai', at: order.started_at },
    { label: 'Pekerjaan selesai', at: order.completed_at },
    { label: 'Sengketa dibuka', at: order.disputed_at },
  ].filter((t): t is { label: string; at: string } => Boolean(t.at));

  /* Tombol aksi dipakai dua kali: bottom bar (mobile) & sidebar (desktop). */
  const actions = (
    <>
      {status === 'WAITING_PAYMENT' && (
        <Button
          className="flex-1 bg-[#b51822] hover:bg-[#90121a] rounded-lg"
          onClick={() => router.push(`/payment/${orderId}`)}
        >
          <Wallet className="w-4 h-4 mr-1.5" /> Bayar Sekarang
        </Button>
      )}

      {status === 'WAITING_ADDITIONAL_PAY' && (
        <Button
          className="flex-1 bg-[#b51822] hover:bg-[#90121a] rounded-lg"
          onClick={() => router.push(`/orders/${order.id}/additional-fee`)}
        >
          Lihat Detail Tagihan
        </Button>
      )}

      {status === 'WAITING_CUSTOMER_CONFIRM' && (
        <>
          <Button
            variant="outline"
            className="flex-1 border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded-lg"
            onClick={() => router.push(`/orders/${order.id}/dispute`)}
          >
            Lapor Masalah
          </Button>
          <Button
            className="flex-1 bg-[#38A169] hover:bg-[#2F855A] rounded-lg"
            onClick={() => handleAction('finish')}
            disabled={actionLoading}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Konfirmasi Selesai
          </Button>
        </>
      )}

      {status === 'IN_PROGRESS' && (
        <Button
          variant="outline"
          className="flex-1 border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded-lg"
          onClick={() => router.push(`/orders/${order.id}/dispute`)}
        >
          <AlertTriangle className="w-4 h-4 mr-1.5" /> Lapor Masalah
        </Button>
      )}

      {(status === 'WAITING_CONFIRMATION' || status === 'PAID') && (
        <Button
          variant="outline"
          className="flex-1 border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded-lg"
          onClick={() => setShowCancelDialog(true)}
          disabled={actionLoading}
        >
          Batalkan Pesanan
        </Button>
      )}

      {status === 'COMPLETED' && !order.review && (
        <Button
          className="flex-1 bg-[#b51822] hover:bg-[#90121a] rounded-lg"
          onClick={() => router.push(`/orders/${order.id}/review`)}
        >
          <Star className="w-4 h-4 mr-1.5" /> Beri Ulasan
        </Button>
      )}

      {status === 'DISPUTED' && (
        <Button
          className="flex-1 bg-[#25D366] hover:bg-[#128C7E] rounded-lg"
          onClick={() => window.open(csWhatsAppUrl(`Halo CS Posko Jasa. Saya melaporkan masalah pada Pesanan #${order.order_number}.`), '_blank')}
        >
          Hubungi CS via WhatsApp
        </Button>
      )}
    </>
  );

  const hasActions =
    status !== 'CANCELLED' && !(status === 'COMPLETED' && Boolean(order.review));

  /* Ringkasan pembayaran — gaya struk. Dipakai di kolom kanan (desktop)
     dan inline di aliran utama (mobile). */
  const paymentSummary = (
    <Section title="Ringkasan Pembayaran" icon={Wallet}>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-[#5b403e]">
          <span>Subtotal Layanan</span>
          <span className="text-[#1c1b1b]">{formatPrice(order.total_service_price)}</span>
        </div>
        {order.promo_discount > 0 && (
          <div className="flex justify-between text-[#38A169]">
            <span>Diskon Promo</span>
            <span>− {formatPrice(order.promo_discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-[#5b403e]">
          <span>Biaya Transport</span>
          <span className={order.transport_fee === 0 ? 'text-[#38A169] font-medium' : 'text-[#1c1b1b]'}>
            {order.transport_fee === 0 ? 'Gratis' : formatPrice(order.transport_fee)}
          </span>
        </div>
        <div className="flex justify-between text-[#5b403e]">
          <span>Biaya Admin</span>
          <span className="text-[#1c1b1b]">{formatPrice(order.admin_fee)}</span>
        </div>

        <div className="border-t border-dashed border-[#e5e2e1] pt-2 mt-2 flex justify-between font-semibold">
          <span className="text-[#1c1b1b]">Total Pesanan</span>
          <span className="text-[#1c1b1b]">{formatPrice(order.total_amount)}</span>
        </div>

        {paidFees.length > 0 && (
          <>
            {paidFees.map(f => (
              <div key={f.id} className="flex justify-between text-[#5b403e]">
                <span className="truncate pr-2">Biaya tambahan · {f.item_name}</span>
                <span className="text-[#1c1b1b] shrink-0">{formatPrice(f.total)}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-[#e5e2e1] pt-2 mt-2 flex justify-between font-bold text-base">
              <span className="text-[#1c1b1b]">Total Dibayar</span>
              <span className="text-[#b51822]">{formatPrice(grandTotal)}</span>
            </div>
          </>
        )}

        {paidFees.length === 0 && (
          <div className="flex justify-between font-bold text-base pt-1">
            <span className="text-[#1c1b1b]">Total Dibayar</span>
            <span className="text-[#b51822]">{formatPrice(order.total_amount)}</span>
          </div>
        )}

        {order.refunded_amount !== undefined && order.refunded_amount > 0 && (
          <div className="flex justify-between text-[#38A169] font-medium border-t border-[#e5e2e1] pt-2 mt-2">
            <span>Dana Dikembalikan</span>
            <span>{formatPrice(order.refunded_amount)}</span>
          </div>
        )}
      </div>
    </Section>
  );

  return (
    <div className="page-h bg-[#f7f5f4] pb-28 lg:pb-10">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-[#38A169]' : 'bg-[#E53E3E]'}`}>
          {toast.message}
        </div>
      )}

      {/* Header mobile — di desktop TopNavbar sudah jadi satu-satunya header. */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-3 sticky top-0 z-30 lg:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded-lg" aria-label="Kembali">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#1c1b1b] leading-tight">Detail Pesanan</h1>
            <p className="text-xs text-[#9e8e8c] truncate">{order.order_number}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
        <div className="hidden lg:flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#1c1b1b]">Detail Pesanan</h1>
            <p className="text-sm text-[#9e8e8c] mt-1">{order.order_number}</p>
          </div>
          <Button variant="outline" className="rounded-lg border-[#e5e2e1] text-[#5b403e]" onClick={() => router.push('/orders')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Semua Pesanan
          </Button>
        </div>

        {/* ── Status hero ─────────────────────────────────────────── */}
        <div className={`rounded-xl bg-gradient-to-br ${hero.tone} text-white p-5 sm:p-6 mb-4`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <StatusBadge status={status} size="sm" className="bg-white/20 border-white/30 text-white mb-2" />
              <h2 className="text-lg sm:text-xl font-bold leading-snug">{hero.title}</h2>
              <p className="text-sm text-white/85 mt-1 max-w-xl">{hero.desc}</p>
            </div>

            {status === 'WAITING_PAYMENT' && order.payment_expired_at && (
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center shrink-0">
                <p className="text-[11px] text-white/80 mb-0.5">Bayar sebelum</p>
                <CountdownTimer
                  targetDate={order.payment_expired_at}
                  format="mm:ss"
                  criticalThresholdSeconds={300}
                  onExpire={fetchOrder}
                  className="!text-white text-lg"
                />
              </div>
            )}
            {status === 'WAITING_CONFIRMATION' && order.confirmation_expired_at && (
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center shrink-0">
                <p className="text-[11px] text-white/80 mb-0.5">Batas konfirmasi</p>
                <CountdownTimer
                  targetDate={order.confirmation_expired_at}
                  format="mm:ss"
                  criticalThresholdSeconds={300}
                  onExpire={fetchOrder}
                  className="!text-white text-lg"
                />
              </div>
            )}
            {status === 'WAITING_CUSTOMER_CONFIRM' && order.confirmation_expired_at && (
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center shrink-0">
                <p className="text-[11px] text-white/80 mb-0.5">Dana cair otomatis dalam</p>
                <CountdownTimer
                  targetDate={order.confirmation_expired_at}
                  format="hh:mm:ss"
                  criticalThresholdSeconds={7200}
                  warningThresholdSeconds={43200}
                  onExpire={fetchOrder}
                  className="!text-white text-lg"
                />
              </div>
            )}
          </div>

          {status === 'CANCELLED' && order.cancellation_reason && (
            <div className="mt-4 bg-white/15 rounded-lg px-3 py-2 text-sm">
              <span className="text-white/80">Alasan: </span>
              {order.cancellation_reason}
              {order.cancelled_by && (
                <span className="text-white/70">
                  {' '}· dibatalkan oleh {order.cancelled_by === 'PARTNER' ? 'mitra' : 'kamu'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Progress tracker ────────────────────────────────────── */}
        {!offTrack && (
          <Section className="mb-4">
            <div className="flex items-start">
              {STEPS.map((label, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <div key={label} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && (
                      <div
                        className={`absolute top-[11px] right-1/2 w-full h-0.5 ${i <= step ? 'bg-[#38A169]' : 'bg-[#e5e2e1]'}`}
                        aria-hidden
                      />
                    )}
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                        done
                          ? 'bg-[#38A169] border-[#38A169] text-white'
                          : active
                          ? 'bg-white border-[#b51822] text-[#b51822]'
                          : 'bg-white border-[#e5e2e1] text-[#9e8e8c]'
                      }`}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : <span className={`w-2 h-2 rounded-full ${active ? 'bg-[#b51822] animate-pulse' : 'bg-[#e5e2e1]'}`} />}
                    </div>
                    <span className={`mt-1.5 text-[10px] sm:text-xs text-center leading-tight ${active ? 'font-semibold text-[#1c1b1b]' : done ? 'text-[#5b403e]' : 'text-[#9e8e8c]'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Dua kolom di desktop, satu aliran di mobile ─────────── */}
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-5 lg:items-start space-y-4 lg:space-y-0">
          <div className="space-y-4">
            {/* Mitra */}
            {order.partner && (
              <Section title="Mitra" icon={ShieldCheck}>
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full bg-[#e5e2e1] flex items-center justify-center text-xl font-bold text-[#5b403e] overflow-hidden">
                      {order.partner.avatar_url
                        ? <img src={order.partner.avatar_url} alt={order.partner.name} className="w-full h-full object-cover" />
                        : order.partner.name.charAt(0).toUpperCase()}
                    </div>
                    {order.partner.is_online && (
                      <span
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#38A169] border-2 border-white"
                        title="Sedang online"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#1c1b1b] truncate">{order.partner.name}</p>
                      {order.partner.is_online && (
                        <span className="text-[10px] font-medium text-[#38A169] bg-[#38A169]/10 px-1.5 py-0.5 rounded">Online</span>
                      )}
                    </div>

                    {order.partner.username && (
                      <p className="text-xs text-[#9e8e8c] truncate">@{order.partner.username}</p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-sm flex-wrap">
                      {order.partner.rating !== undefined && order.partner.rating > 0 ? (
                        <span className="flex items-center gap-1 text-[#1c1b1b]">
                          <Star className="w-3.5 h-3.5 fill-[#D69E2E] text-[#D69E2E]" />
                          <span className="font-semibold">{order.partner.rating.toFixed(1)}</span>
                          {order.partner.total_reviews !== undefined && (
                            <span className="text-[#9e8e8c] text-xs">({order.partner.total_reviews} ulasan)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9e8e8c]">Belum ada ulasan</span>
                      )}
                      {order.partner.total_orders !== undefined && order.partner.total_orders > 0 && (
                        <span className="text-xs text-[#9e8e8c]">{order.partner.total_orders} pesanan selesai</span>
                      )}
                    </div>

                    {order.partner.phone_masked && (
                      <p className="text-xs text-[#9e8e8c] flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {order.partner.phone_masked}
                        <span className="text-[#c9bcba]">· chat untuk menghubungi</span>
                      </p>
                    )}

                    {order.partner.bio && (
                      <p className="text-xs text-[#5b403e] mt-1.5 line-clamp-2">{order.partner.bio}</p>
                    )}

                    {order.partner.service_area && order.partner.service_area.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {order.partner.service_area.slice(0, 3).map(area => (
                          <span key={area} className="text-[10px] text-[#5b403e] bg-[#f7f5f4] border border-[#e5e2e1] px-1.5 py-0.5 rounded">
                            {area}
                          </span>
                        ))}
                        {order.partner.service_area.length > 3 && (
                          <span className="text-[10px] text-[#9e8e8c] px-1">+{order.partner.service_area.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs border-[#e5e2e1] text-[#5b403e] rounded-lg shrink-0"
                    onClick={handleChat}
                    disabled={isChatLoading || !order.partner.user_id}
                  >
                    {isChatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    Chat
                  </Button>
                </div>

                {order.partner.username && (
                  <Link
                    href={`/${order.partner.username}`}
                    className="mt-3 pt-3 border-t border-[#e5e2e1] flex items-center justify-between text-sm text-[#b51822] font-medium hover:underline"
                  >
                    Lihat profil & portofolio mitra
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </Section>
            )}

            {/* Layanan */}
            <Section title="Detail Layanan" icon={ClipboardList}>
              <div className="divide-y divide-[#e5e2e1]">
                {order.items?.map(item => (
                  <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-14 h-14 rounded-lg bg-[#f7f5f4] border border-[#e5e2e1] overflow-hidden shrink-0 flex items-center justify-center">
                      {item.photo_url
                        ? <img src={item.photo_url} alt={item.service_name} className="w-full h-full object-cover" />
                        : <ClipboardList className="w-5 h-5 text-[#c9bcba]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1c1b1b] leading-snug">{item.service_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#9e8e8c]">
                        <span>{item.quantity}x</span>
                        <span>·</span>
                        <span>{formatPrice(item.price)}</span>
                        {item.duration ? (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> {formatDuration(item.duration)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#1c1b1b] shrink-0">
                      {formatPrice(item.price * (item.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Biaya tambahan — backend mengirim array; tiap item punya status sendiri. */}
            {(order.additional_fees?.length ?? 0) > 0 && (
              <Section title="Biaya Tambahan" icon={AlertTriangle}>
                <div className="space-y-2">
                  {order.additional_fees!.map(fee => (
                    <div key={fee.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-[#1c1b1b] truncate">{fee.item_name}</p>
                        <p className="text-xs text-[#9e8e8c]">
                          {fee.type === 'material' ? 'Material' : 'Jasa'} · {fee.quantity}x {formatPrice(fee.price)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-[#1c1b1b]">{formatPrice(fee.total)}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          fee.status === 'PAID' ? 'text-[#38A169] bg-[#38A169]/10'
                          : fee.status === 'REJECTED' ? 'text-[#9e8e8c] bg-[#f7f5f4]'
                          : 'text-[#DD6B20] bg-[#DD6B20]/10'
                        }`}>
                          {fee.status === 'PAID' ? 'Dibayar' : fee.status === 'REJECTED' ? 'Ditolak' : 'Menunggu persetujuan'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {pendingFees.length > 0 && (
                  <button
                    onClick={() => router.push(`/orders/${order.id}/additional-fee`)}
                    className="mt-3 pt-3 border-t border-[#e5e2e1] w-full flex items-center justify-between text-sm text-[#b51822] font-medium"
                  >
                    Tinjau {pendingFees.length} tagihan menunggu persetujuan
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </Section>
            )}

            {/* Jadwal & lokasi */}
            <Section title="Jadwal & Lokasi" icon={MapPin}>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-sm">
                  <Calendar className="w-4 h-4 text-[#b51822] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[#1c1b1b]">{formatDate(order.scheduled_at)}</p>
                    <p className="text-xs text-[#9e8e8c] mt-0.5">Waktu mitra dijadwalkan datang</p>
                  </div>
                </div>
                {order.service_address && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="w-4 h-4 text-[#b51822] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#1c1b1b]">{order.service_address}</p>
                      {order.address_detail && (
                        <p className="text-xs text-[#9e8e8c] mt-0.5">{order.address_detail}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {order.notes && (
                <div className="mt-3 pt-3 border-t border-[#e5e2e1]">
                  <p className="text-xs text-[#9e8e8c] mb-1">Catatan untuk mitra</p>
                  <p className="text-sm text-[#1c1b1b]">{order.notes}</p>
                </div>
              )}

              {order.photos && order.photos.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#e5e2e1]">
                  <p className="text-xs text-[#9e8e8c] mb-2">Foto dari kamu</p>
                  <div className="flex gap-2 flex-wrap">
                    {order.photos.map((photo, i) => (
                      <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                        <img
                          src={photo}
                          alt={`Foto pesanan ${i + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-[#e5e2e1] hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Ulasan */}
            {order.review && (
              <Section title="Ulasan Kamu" icon={Star}>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= order.review!.rating ? 'fill-[#D69E2E] text-[#D69E2E]' : 'text-[#e5e2e1]'}`} />
                  ))}
                  <span className="text-sm text-[#5b403e] ml-1">{order.review.rating}/5</span>
                  <span className="text-xs text-[#9e8e8c] ml-auto">{formatShort(order.review.created_at)}</span>
                </div>
                {order.review.comment && (
                  <p className="text-sm text-[#1c1b1b]">&ldquo;{order.review.comment}&rdquo;</p>
                )}
                {order.review.image_urls && order.review.image_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {order.review.image_urls.map((img, i) => (
                      <img key={i} src={img} alt={`Foto ulasan ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-[#e5e2e1]" />
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* Riwayat + info pesanan */}
            <Section title="Info Pesanan" icon={ClipboardList}>
              <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-[#e5e2e1]">
                <span className="text-[#9e8e8c]">Nomor Pesanan</span>
                <button onClick={copyOrderNumber} className="flex items-center gap-1.5 font-medium text-[#1c1b1b] hover:text-[#b51822]">
                  {order.order_number}
                  {copied ? <Check className="w-3.5 h-3.5 text-[#38A169]" /> : <Copy className="w-3.5 h-3.5 text-[#9e8e8c]" />}
                </button>
              </div>
              <ol className="space-y-2.5">
                {timeline.map((t, i) => (
                  <li key={t.label} className="flex items-start gap-2.5 text-sm">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${i === timeline.length - 1 ? 'bg-[#b51822]' : 'bg-[#c9bcba]'}`} />
                    <span className="text-[#5b403e] flex-1">{t.label}</span>
                    <span className="text-xs text-[#9e8e8c] shrink-0">{formatShort(t.at)}</span>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          {/* Kolom kanan (desktop): ringkasan + aksi, ikut scroll */}
          <div className="space-y-4 lg:sticky lg:top-20">
            {paymentSummary}
            {hasActions && (
              <div className="hidden lg:block bg-white rounded-xl border border-[#e5e2e1] p-4">
                <div className="flex flex-col gap-2">{actions}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action bar mobile */}
      {hasActions && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-20 lg:hidden pb-safe">
          <div className="flex gap-2">{actions}</div>
        </div>
      )}

      {/* Dialog pembatalan */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1c1b1b]">Batalkan Pesanan?</h3>
              <button onClick={() => setShowCancelDialog(false)} aria-label="Tutup">
                <X className="w-5 h-5 text-[#9e8e8c]" />
              </button>
            </div>
            <p className="text-sm text-[#5b403e] mb-4">
              {status === 'WAITING_CONFIRMATION'
                ? 'Pesanan akan dibatalkan. Kamu belum dikenakan biaya apapun.'
                : 'Pesanan akan dibatalkan dan tidak dapat dikembalikan. Biaya layanan yang sudah dibayar akan dikembalikan ke saldo dompetmu.'}
            </p>
            <div className="mb-6">
              <label htmlFor="cancel-reason" className="block text-sm font-medium text-[#1c1b1b] mb-1">
                Alasan Pembatalan
              </label>
              <select
                id="cancel-reason"
                className="w-full px-3 py-2 border border-[#e5e2e1] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
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
              <Button variant="outline" className="flex-1 rounded-lg border-[#e5e2e1]" onClick={() => setShowCancelDialog(false)}>
                Batal
              </Button>
              <Button className="flex-1 bg-[#E53E3E] hover:bg-[#C53030] rounded-lg" onClick={handleCancel} disabled={actionLoading}>
                {actionLoading ? 'Memproses...' : 'Ya, Batalkan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
