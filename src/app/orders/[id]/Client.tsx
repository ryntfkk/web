"use client";
import { useToast } from '@/components/ui/toast';

import { getInitial } from '@/lib/utils';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, MapPin, Calendar, MessageSquare, Star, AlertTriangle,
  Phone, CheckCircle2, X, Copy, Check, ChevronRight, Clock,
  ClipboardList, Wallet, ShieldCheck, Loader2, HelpCircle, Scale, Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { StickyActionBar } from '@/components/ui/sticky-action-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, formatDate, formatDateShort, formatDuration } from '@/lib/format';
import { fetchAPI } from '@/lib/api';
import { printOrderReceipt } from '@/lib/receipt';
import OrderHelpModal from '@/components/order/OrderHelpModal';
import { getErrorMessage } from '@/types/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import dynamic from 'next/dynamic';

// Peta hanya di klien (butuh window/Leaflet) → hindari SSR. Sama seperti detail
// order mitra, agar tampilan koordinat konsisten di kedua sisi.
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

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
  district?: string;
  city?: string;
  province?: string;
  // Koordinat lokasi pengerjaan (snapshot saat order dibuat) — untuk peta,
  // konsisten dengan detail order mitra.
  service_lat?: number;
  service_lon?: number;
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

/** Tampilan hero per status: warna band + kalimat yang menjelaskan
 *  apa yang terjadi dan apa yang harus dilakukan pelanggan. */
const HERO: Record<OrderStatus, { tone: string; title: string; desc: string }> = {
  WAITING_CONFIRMATION: {
    tone: 'from-brand-warning to-brand-amber-dark',
    title: 'Menunggu konfirmasi mitra',
    desc: 'Mitra sedang meninjau pesananmu. Kamu belum dikenakan biaya apapun.',
  },
  WAITING_PAYMENT: {
    tone: 'from-brand-orange to-brand-orange-dark',
    title: 'Selesaikan pembayaran',
    desc: 'Mitra sudah menerima pesananmu. Bayar sebelum waktu habis agar jadwal tidak hangus.',
  },
  PAID: {
    tone: 'from-brand-info to-brand-info-dark',
    title: 'Pembayaran berhasil',
    desc: 'Dana ditahan aman oleh Posko Jasa. Mitra akan datang sesuai jadwal.',
  },
  IN_PROGRESS: {
    tone: 'from-[#805AD5] to-brand-purple',
    title: 'Mitra sedang bekerja',
    desc: 'Pekerjaan sedang berlangsung. Hubungi mitra lewat chat bila ada yang perlu disampaikan.',
  },
  WAITING_ADDITIONAL_PAY: {
    tone: 'from-brand-orange to-brand-orange-dark',
    title: 'Ada tagihan tambahan',
    desc: 'Mitra mengajukan biaya tambahan. Tinjau dan setujui agar pekerjaan bisa dilanjutkan.',
  },
  WAITING_CUSTOMER_CONFIRM: {
    tone: 'from-[#5A67D8] to-brand-purple-dark',
    title: 'Pekerjaan selesai — mohon konfirmasi',
    desc: 'Mitra menyatakan pekerjaan sudah selesai. Periksa hasilnya, lalu tekan Konfirmasi Selesai untuk mencairkan dana. Tanpa konfirmasi dalam 24 jam, dana cair otomatis ke mitra.',
  },
  COMPLETED: {
    tone: 'from-brand-success to-brand-success-dark',
    title: 'Pesanan selesai',
    desc: 'Terima kasih! Ceritakan pengalamanmu lewat ulasan untuk membantu pelanggan lain.',
  },
  CANCELLED: {
    tone: 'from-[#718096] to-brand-slate',
    title: 'Pesanan dibatalkan',
    desc: 'Pesanan ini sudah tidak berjalan.',
  },
  DISPUTED: {
    tone: 'from-brand-error to-brand-error-dark',
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
    <section className={`bg-white rounded-xl border border-brand-gray-100 p-4 sm:p-5 ${className}`}>
      {title && (
        <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-gray-900 mb-3">
          {Icon && <Icon className="w-4 h-4 text-brand-red" />}
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
  const { showToast } = useToast();
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [finishChecked, setFinishChecked] = useState(false);
  
  const isSubmittingRef = React.useRef(false);


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
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    try {
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
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
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
      <div className="page-h bg-brand-gray-60 pb-20">
        <div className="bg-white border-b border-brand-gray-100 px-4 py-4 lg:hidden">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-brand-gray-100 p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-h bg-brand-gray-60 flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-gray-700 mb-4">Pesanan tidak ditemukan.</p>
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
          className="flex-1 bg-brand-red hover:bg-brand-red-dark rounded-lg"
          onClick={() => router.push(`/payment/${orderId}`)}
        >
          <Wallet className="w-4 h-4 mr-1.5" /> Bayar Sekarang
        </Button>
      )}

      {status === 'WAITING_ADDITIONAL_PAY' && (
        <Button
          className="flex-1 bg-brand-red hover:bg-brand-red-dark rounded-lg"
          onClick={() => router.push(`/orders/${order.id}/additional-fee`)}
        >
          Lihat Detail Tagihan
        </Button>
      )}

      {status === 'WAITING_CUSTOMER_CONFIRM' && (
        <>
          <Button
            variant="outline"
            className="flex-1 border-brand-error text-brand-error hover:bg-red-50 rounded-lg"
            onClick={() => router.push(`/orders/${order.id}/dispute`)}
          >
            Lapor Masalah
          </Button>
          <Button
            className="flex-1 bg-brand-success hover:bg-[#2F855A] rounded-lg"
            onClick={() => { setFinishChecked(false); setShowFinishConfirm(true); }}
            disabled={actionLoading}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Konfirmasi Selesai
          </Button>
        </>
      )}

      {status === 'IN_PROGRESS' && (
        <Button
          variant="outline"
          className="flex-1 border-brand-error text-brand-error hover:bg-red-50 rounded-lg"
          onClick={() => router.push(`/orders/${order.id}/dispute`)}
        >
          <AlertTriangle className="w-4 h-4 mr-1.5" /> Lapor Masalah
        </Button>
      )}

      {/* Pra-bayar: pelanggan boleh membatalkan (belum ada uang berpindah). */}
      {(status === 'WAITING_CONFIRMATION' || status === 'WAITING_PAYMENT') && (
        <Button
          variant="outline"
          className="flex-1 border-brand-error text-brand-error hover:bg-red-50 rounded-lg"
          onClick={() => setShowCancelDialog(true)}
          disabled={actionLoading}
        >
          Batalkan Pesanan
        </Button>
      )}

      {/* Pasca-bayar: TIDAK bisa batal sepihak. Pembatalan lewat sengketa yang
          ditinjau admin (cegah pembatalan semena-mena setelah mitra menyiapkan). */}
      {status === 'PAID' && (
        <Button
          variant="outline"
          className="flex-1 border-brand-error text-brand-error hover:bg-red-50 rounded-lg"
          onClick={() => router.push(`/orders/${order.id}/dispute`)}
        >
          <AlertTriangle className="w-4 h-4 mr-1.5" /> Ajukan Sengketa
        </Button>
      )}

      {status === 'COMPLETED' && !order.review && (
        <Button
          className="flex-1 bg-brand-red hover:bg-brand-red-dark rounded-lg"
          onClick={() => router.push(`/orders/${order.id}/review`)}
        >
          <Star className="w-4 h-4 mr-1.5" /> Beri Ulasan
        </Button>
      )}

      {status === 'DISPUTED' && (
        <Button
          className="flex-1 bg-brand-red hover:bg-brand-red-dark rounded-lg flex items-center justify-center gap-1.5"
          onClick={async () => {
            const res = await fetchAPI<{ id: string }>(`/disputes/order/${order.id}`);
            if (res.success && res.data?.id) router.push(`/disputes/${res.data.id}`);
            else router.push('/bantuan');
          }}
        >
          <Scale className="w-4 h-4" /> Buka Ruang Sengketa
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
        <div className="flex justify-between text-brand-gray-700">
          <span>Subtotal Layanan</span>
          <span className="text-brand-gray-900">{formatPrice(order.total_service_price)}</span>
        </div>
        {order.promo_discount > 0 && (
          <div className="flex justify-between text-brand-success">
            <span>Diskon Promo</span>
            <span>− {formatPrice(order.promo_discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-brand-gray-700">
          <span>Biaya Transport</span>
          <span className={order.transport_fee === 0 ? 'text-brand-success font-medium' : 'text-brand-gray-900'}>
            {order.transport_fee === 0 ? 'Gratis' : formatPrice(order.transport_fee)}
          </span>
        </div>
        <div className="flex justify-between text-brand-gray-700">
          <span>Biaya Layanan (Platform)</span>
          <span className="text-brand-gray-900">{formatPrice(order.admin_fee)}</span>
        </div>

        <div className="border-t border-dashed border-brand-gray-100 pt-2 mt-2 flex justify-between font-semibold">
          <span className="text-brand-gray-900">Total Pesanan</span>
          <span className="text-brand-gray-900">{formatPrice(order.total_amount)}</span>
        </div>

        {paidFees.length > 0 && (
          <>
            {paidFees.map(f => (
              <div key={f.id} className="flex justify-between text-brand-gray-700">
                <span className="truncate pr-2">Biaya tambahan · {f.item_name}</span>
                <span className="text-brand-gray-900 shrink-0">{formatPrice(f.total)}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-brand-gray-100 pt-2 mt-2 flex justify-between font-bold text-base">
              <span className="text-brand-gray-900">Total Dibayar</span>
              <span className="text-brand-red">{formatPrice(grandTotal)}</span>
            </div>
          </>
        )}

        {paidFees.length === 0 && (
          <div className="flex justify-between font-bold text-base pt-1">
            <span className="text-brand-gray-900">Total Dibayar</span>
            <span className="text-brand-red">{formatPrice(order.total_amount)}</span>
          </div>
        )}

        {order.refunded_amount !== undefined && order.refunded_amount > 0 && (
          <>
            <div className="flex justify-between text-brand-success font-medium border-t border-brand-gray-100 pt-2 mt-2">
              <span>Dana Dikembalikan</span>
              <span>{formatPrice(order.refunded_amount)}</span>
            </div>
            <button
              onClick={() => router.push('/profile/wallet')}
              className="w-full mt-1 text-left text-xs text-brand-info hover:underline"
            >
              Dana masuk ke saldo dompetmu — lihat di Dompet →
            </button>
          </>
        )}

        {/* U3: unduh/cetak struk — hanya setelah pembayaran (ada yang bisa distrukkan). */}
        {order.paid_at && (
          <button
            onClick={() => printOrderReceipt(order)}
            className="w-full mt-3 inline-flex items-center justify-center gap-2 h-10 rounded-md border border-brand-gray-100 bg-white text-sm font-semibold text-brand-gray-900 hover:border-brand-blue hover:text-brand-blue transition-colors"
          >
            <Printer className="w-4 h-4" /> Unduh / Cetak Struk
          </button>
        )}
      </div>
    </Section>
  );

  return (
    <div className="page-h bg-brand-gray-60 pb-28 lg:pb-10">
      {/* Header mobile — di desktop TopNavbar sudah jadi satu-satunya header. */}
      <div className="bg-white border-b border-brand-gray-100 px-4 py-3 sticky top-0 z-30 lg:hidden">
        <div className="flex items-center gap-3">
          {/* Tujuan tetap (bukan router.back): pengguna bisa tiba di sini dari
              halaman transien (status pembayaran sukses, form booking) — back
              berbasis history akan memantulkan mereka ke halaman itu lagi. */}
          <button onClick={() => router.push('/orders')} className="p-2 -ml-2 hover:bg-brand-gray-60 rounded-lg" aria-label="Kembali">
            <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-brand-gray-900 leading-tight">Detail Pesanan</h1>
            <p className="text-xs text-brand-gray-450 truncate">{order.order_number}</p>
          </div>
          <button
            onClick={() => setHelpOpen(true)}
            className="ml-auto flex items-center gap-1 p-2 -mr-2 rounded-lg text-brand-gray-700 hover:bg-brand-gray-60"
            aria-label="Bantuan"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-xs font-medium">Bantuan</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
        <div className="hidden lg:flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">Detail Pesanan</h1>
            <p className="text-sm text-brand-gray-450 mt-1">{order.order_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-lg border-brand-gray-100 text-brand-gray-700"
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle className="w-4 h-4 mr-1.5" /> Bantuan
            </Button>
            <Button variant="outline" className="rounded-lg border-brand-gray-100 text-brand-gray-700" onClick={() => router.push('/orders')}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Semua Pesanan
            </Button>
          </div>
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
                        className={`absolute top-[11px] right-1/2 w-full h-0.5 ${i <= step ? 'bg-brand-success' : 'bg-brand-gray-100'}`}
                        aria-hidden
                      />
                    )}
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                        done
                          ? 'bg-brand-success border-brand-success text-white'
                          : active
                          ? 'bg-white border-brand-red text-brand-red'
                          : 'bg-white border-brand-gray-100 text-brand-gray-450'
                      }`}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : <span className={`w-2 h-2 rounded-full ${active ? 'bg-brand-red animate-pulse' : 'bg-brand-gray-100'}`} />}
                    </div>
                    <span className={`mt-1.5 text-[10px] sm:text-xs text-center leading-tight ${active ? 'font-semibold text-brand-gray-900' : done ? 'text-brand-gray-700' : 'text-brand-gray-450'}`}>
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
                    <div className="relative w-14 h-14 rounded-full bg-brand-gray-100 flex items-center justify-center text-xl font-bold text-brand-gray-700 overflow-hidden">
                      {order.partner.avatar_url
                        ? <Image src={order.partner.avatar_url} alt={order.partner.name} fill sizes="56px" className="object-cover" />
                        : getInitial(order.partner.name)}
                    </div>
                    {order.partner.is_online && (
                      <span
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-brand-success border-2 border-white"
                        title="Sedang online"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-brand-gray-900 truncate">{order.partner.name}</p>
                      {order.partner.is_online && (
                        <span className="text-[10px] font-medium text-brand-success bg-brand-success/10 px-1.5 py-0.5 rounded">Online</span>
                      )}
                    </div>

                    {order.partner.username && (
                      <p className="text-xs text-brand-gray-450 truncate">@{order.partner.username}</p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-sm flex-wrap">
                      {order.partner.rating !== undefined && order.partner.rating > 0 ? (
                        <span className="flex items-center gap-1 text-brand-gray-900">
                          <Star className="w-3.5 h-3.5 fill-brand-warning text-brand-warning" />
                          <span className="font-semibold">{order.partner.rating.toFixed(1)}</span>
                          {order.partner.total_reviews !== undefined && (
                            <span className="text-brand-gray-450 text-xs">({order.partner.total_reviews} ulasan)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-brand-gray-450">Belum ada ulasan</span>
                      )}
                      {order.partner.total_orders !== undefined && order.partner.total_orders > 0 && (
                        <span className="text-xs text-brand-gray-450">{order.partner.total_orders} pesanan selesai</span>
                      )}
                    </div>



                    {order.partner.service_area && order.partner.service_area.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {order.partner.service_area.slice(0, 3).map(area => (
                          <span key={area} className="text-[10px] text-brand-gray-700 bg-brand-gray-60 border border-brand-gray-100 px-1.5 py-0.5 rounded">
                            {area}
                          </span>
                        ))}
                        {order.partner.service_area.length > 3 && (
                          <span className="text-[10px] text-brand-gray-450 px-1">+{order.partner.service_area.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs border-brand-gray-100 text-brand-gray-700 rounded-lg shrink-0"
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
                    className="mt-3 pt-3 border-t border-brand-gray-100 flex items-center justify-between text-sm text-brand-red font-medium hover:underline"
                  >
                    Lihat profil & portofolio mitra
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </Section>
            )}

            {/* Layanan */}
            <Section title="Detail Layanan" icon={ClipboardList}>
              <div className="divide-y divide-brand-gray-100">
                {order.items?.map(item => (
                  <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="relative w-14 h-14 rounded-lg bg-brand-gray-60 border border-brand-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.photo_url
                        ? <Image src={item.photo_url} alt={item.service_name} fill sizes="56px" className="object-cover" />
                        : <ClipboardList className="w-5 h-5 text-brand-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-gray-900 leading-snug">{item.service_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-brand-gray-450">
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
                    <span className="text-sm font-semibold text-brand-gray-900 shrink-0">
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
                        <p className="text-brand-gray-900 truncate">{fee.item_name}</p>
                        <p className="text-xs text-brand-gray-450">
                          {fee.type === 'material' ? 'Material' : 'Jasa'} · {fee.quantity}x {formatPrice(fee.price)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-brand-gray-900">{formatPrice(fee.total)}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          fee.status === 'PAID' ? 'text-brand-success bg-brand-success/10'
                          : fee.status === 'REJECTED' ? 'text-brand-gray-450 bg-brand-gray-60'
                          : 'text-brand-orange bg-brand-orange/10'
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
                    className="mt-3 pt-3 border-t border-brand-gray-100 w-full flex items-center justify-between text-sm text-brand-red font-medium"
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
                  <Calendar className="w-4 h-4 text-brand-red mt-0.5 shrink-0" />
                  <div>
                    <p className="text-brand-gray-900">{formatDate(order.scheduled_at)}</p>
                    <p className="text-xs text-brand-gray-450 mt-0.5">Waktu mitra dijadwalkan datang</p>
                  </div>
                </div>
                {order.service_address && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="w-4 h-4 text-brand-red mt-0.5 shrink-0" />
                    <div>
                      <p className="text-brand-gray-900">{order.service_address}</p>
                      {order.address_detail && (
                        <p className="text-xs text-brand-gray-450 mt-0.5">{order.address_detail}</p>
                      )}
                      {(order.district || order.city || order.province) && (
                        <p className="text-xs text-brand-gray-700 mt-0.5">
                          {[order.district, order.city, order.province].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {/* Peta koordinat lokasi pengerjaan (snapshot saat order dibuat) —
                    konsisten dengan detail order mitra. */}
                {typeof order.service_lat === 'number' && typeof order.service_lon === 'number' &&
                  !(order.service_lat === 0 && order.service_lon === 0) && (
                  <MapView
                    lat={order.service_lat}
                    lng={order.service_lon}
                    label={order.service_address}
                    className="h-48"
                  />
                )}
              </div>

              {order.notes && (
                <div className="mt-3 pt-3 border-t border-brand-gray-100">
                  <p className="text-xs text-brand-gray-450 mb-1">Catatan untuk mitra</p>
                  <p className="text-sm text-brand-gray-900">{order.notes}</p>
                </div>
              )}

              {order.photos && order.photos.length > 0 && (
                <div className="mt-3 pt-3 border-t border-brand-gray-100">
                  <p className="text-xs text-brand-gray-450 mb-2">Foto dari kamu</p>
                  <div className="flex gap-2 flex-wrap">
                    {order.photos.map((photo, i) => (
                      <a
                        key={i}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block w-20 h-20 rounded-lg border border-brand-gray-100 overflow-hidden hover:opacity-90 transition-opacity"
                      >
                        <Image
                          src={photo}
                          alt={`Foto pesanan ${i + 1}`}
                          fill
                          sizes="80px"
                          className="object-cover"
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
                    <Star key={s} className={`w-4 h-4 ${s <= order.review!.rating ? 'fill-brand-warning text-brand-warning' : 'text-brand-gray-100'}`} />
                  ))}
                  <span className="text-sm text-brand-gray-700 ml-1">{order.review.rating}/5</span>
                  <span className="text-xs text-brand-gray-450 ml-auto">{formatDateShort(order.review.created_at)}</span>
                </div>
                {order.review.comment && (
                  <p className="text-sm text-brand-gray-900">&ldquo;{order.review.comment}&rdquo;</p>
                )}
                {order.review.image_urls && order.review.image_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {order.review.image_urls.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg border border-brand-gray-100 overflow-hidden">
                        <Image src={img} alt={`Foto ulasan ${i + 1}`} fill sizes="64px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* Riwayat + info pesanan */}
            <Section title="Info Pesanan" icon={ClipboardList}>
              <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-brand-gray-100">
                <span className="text-brand-gray-450">Nomor Pesanan</span>
                <button onClick={copyOrderNumber} className="flex items-center gap-1.5 font-medium text-brand-gray-900 hover:text-brand-red">
                  {order.order_number}
                  {copied ? <Check className="w-3.5 h-3.5 text-brand-success" /> : <Copy className="w-3.5 h-3.5 text-brand-gray-450" />}
                </button>
              </div>
              <ol className="space-y-2.5">
                {timeline.map((t, i) => (
                  <li key={t.label} className="flex items-start gap-2.5 text-sm">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${i === timeline.length - 1 ? 'bg-brand-red' : 'bg-brand-gray-300'}`} />
                    <span className="text-brand-gray-700 flex-1">{t.label}</span>
                    <span className="text-xs text-brand-gray-450 shrink-0">{formatDateShort(t.at)}</span>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          {/* Kolom kanan (desktop): ringkasan + aksi, ikut scroll */}
          <div className="space-y-4 lg:sticky lg:top-20">
            {paymentSummary}
            {hasActions && (
              <div className="hidden lg:block bg-white rounded-xl border border-brand-gray-100 p-4">
                <div className="flex flex-col gap-2">{actions}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action bar mobile */}
      {hasActions && (
        <StickyActionBar>
          {actions}
        </StickyActionBar>
      )}

      {/* Konfirmasi Hubungi Admin (tak lagi langsung kirim laporan) */}
      <OrderHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        orderNumber={order.order_number}
      />

      {/* Dialog pembatalan */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-brand-gray-900">Batalkan Pesanan?</h3>
              <button onClick={() => setShowCancelDialog(false)} aria-label="Tutup">
                <X className="w-5 h-5 text-brand-gray-450" />
              </button>
            </div>

            {/* Dialog ini hanya dibuka saat WAITING_CONFIRMATION / WAITING_PAYMENT
                (lihat gate tombol di atas) -- status PAID pakai alur sengketa terpisah. */}
            <p className="text-sm text-brand-gray-700 mb-4">
              Pesanan masih menunggu konfirmasi. Pembatalan gratis — kamu belum dikenakan biaya apapun.
            </p>

            <div className="mb-6">
              <label htmlFor="cancel-reason" className="block text-sm font-medium text-brand-gray-900 mb-1">
                Alasan Pembatalan
              </label>
              <select
                id="cancel-reason"
                className="w-full px-3 py-2 border border-brand-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
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
              <Button variant="outline" className="flex-1 rounded-lg border-brand-gray-100" onClick={() => setShowCancelDialog(false)}>
                Batal
              </Button>
              <Button className="flex-1 bg-brand-error hover:bg-[#C53030] rounded-lg" onClick={handleCancel} disabled={actionLoading}>
                {actionLoading ? 'Memproses...' : 'Ya, Batalkan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi selesai (dual-confirmation) */}
      {showFinishConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-brand-gray-900">Konfirmasi Pekerjaan Selesai</h3>
              <button onClick={() => setShowFinishConfirm(false)} aria-label="Tutup">
                <X className="w-5 h-5 text-brand-gray-450" />
              </button>
            </div>
            <p className="text-sm text-brand-gray-700 mb-4">
              Setelah dikonfirmasi, <strong>dana akan segera dicairkan ke mitra</strong> dan tidak dapat ditarik kembali.
            </p>
            <div className="space-y-2.5 mb-5">
              <p className="text-xs font-semibold text-brand-gray-900 uppercase tracking-wide">Checklist sebelum konfirmasi:</p>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={finishChecked}
                  onChange={e => setFinishChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-brand-success shrink-0"
                />
                <span className="text-sm text-brand-gray-700">
                  Saya sudah memeriksa hasil pekerjaan dan semuanya sesuai dengan yang dijanjikan.
                </span>
              </label>
            </div>
            <div className="p-2.5 bg-brand-success-soft border border-brand-success-light rounded-lg mb-4 text-xs text-brand-success-dark">
              Jika ada masalah yang baru terlihat setelah konfirmasi, kamu masih dapat menghubungi CS kami dalam <strong>3 hari</strong> ke depan.
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-lg border-brand-gray-100" onClick={() => setShowFinishConfirm(false)}>
                Periksa Lagi
              </Button>
              <Button
                className="flex-1 bg-brand-success hover:bg-[#2F855A] rounded-lg"
                onClick={() => { setShowFinishConfirm(false); handleAction('finish'); }}
                disabled={!finishChecked || actionLoading}
              >
                {actionLoading ? 'Memproses...' : 'Konfirmasi & Cairkan Dana'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
