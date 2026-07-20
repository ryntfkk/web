"use client";
import { useToast } from '@/components/ui/toast';

import { getInitial } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, MessageSquare, MapPin, Calendar, Clock, Phone, Loader2, X,
  AlertTriangle, Check, Copy, ClipboardList, Wallet, Star, User, HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { createSupportThread } from '@/lib/support';
import { getErrorMessage } from '@/types/api';
import dynamic from 'next/dynamic';

// Peta hanya di klien (butuh window/Google Maps) → hindari SSR.
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

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
  total_service_price?: number;
  transport_fee?: number;
  promo_discount?: number;
  admin_fee?: number;
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
  service_lat?: number;
  service_lon?: number;
  notes?: string;
  photos?: string[];
  cancellation_reason?: string;
  cancelled_by?: string;
  customer_info?: {
    id: string;
    name: string;
    username?: string;
    phone?: string;
    phone_masked?: string;
    avatar_url?: string;
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
    type: string;
    item_name: string;
    price: number;
    quantity: number;
    total: number;
    status: 'PENDING' | 'PAID' | 'REJECTED';
  }[];
  review?: {
    id: string;
    rating: number;
    comment?: string;
    image_urls?: string[];
    created_at: string;
  };
}

const ADDITIONAL_FEE_LABEL: Record<string, string> = {
  PENDING: 'Menunggu pembayaran pelanggan',
  PAID: 'Sudah dibayar',
  REJECTED: 'Ditolak pelanggan',
};

/** Hero per status, ditulis dari sudut pandang MITRA — apa yang terjadi dan
 *  apa yang harus mitra lakukan sekarang. */
const HERO: Record<OrderStatus, { tone: string; title: string; desc: string }> = {
  WAITING_CONFIRMATION: {
    tone: 'from-[#D69E2E] to-[#B7791F]',
    title: 'Pesanan baru menunggu jawabanmu',
    desc: 'Terima atau tolak sebelum waktu habis. Tanpa respons, pesanan batal otomatis.',
  },
  WAITING_PAYMENT: {
    tone: 'from-[#DD6B20] to-[#B75415]',
    title: 'Menunggu pelanggan membayar',
    desc: 'Kamu sudah menerima pesanan ini. Jadwalmu sudah dikunci sampai pembayaran masuk.',
  },
  PAID: {
    tone: 'from-[#3182CE] to-[#2A6296]',
    title: 'Sudah dibayar — siap dikerjakan',
    desc: 'Dana ditahan aman oleh Posko Jasa. Datang sesuai jadwal, lalu tekan "Mulai Kerjakan".',
  },
  IN_PROGRESS: {
    tone: 'from-[#805AD5] to-[#5F3DC4]',
    title: 'Sedang kamu kerjakan',
    desc: 'Tekan "Selesai" bila pekerjaan rampung. Butuh material tambahan? Ajukan biaya tambahan.',
  },
  WAITING_ADDITIONAL_PAY: {
    tone: 'from-[#DD6B20] to-[#B75415]',
    title: 'Menunggu persetujuan biaya tambahan',
    desc: 'Pekerjaan tertahan sampai pelanggan menyetujui atau menolak tagihan tambahanmu.',
  },
  WAITING_CUSTOMER_CONFIRM: {
    tone: 'from-[#5A67D8] to-[#434190]',
    title: 'Menunggu konfirmasi pelanggan',
    desc: 'Bila pelanggan tidak merespons dalam 24 jam, dana cair otomatis ke saldomu.',
  },
  COMPLETED: {
    tone: 'from-[#38A169] to-[#276749]',
    title: 'Pesanan selesai',
    desc: 'Pendapatan sudah masuk ke saldomu.',
  },
  CANCELLED: {
    tone: 'from-[#718096] to-[#4A5568]',
    title: 'Pesanan dibatalkan',
    desc: 'Pesanan ini sudah tidak berjalan dan jadwalmu kembali terbuka.',
  },
  DISPUTED: {
    tone: 'from-[#E53E3E] to-[#9B2C2C]',
    title: 'Pesanan dalam sengketa',
    desc: 'Dana dibekukan hingga Tim CS menyelesaikan sengketa (maks. 3×24 jam).',
  },
};

const STEPS = ['Masuk', 'Diterima', 'Dibayar', 'Dikerjakan', 'Selesai'] as const;

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

const formatPrice = (p: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const formatShort = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
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

export default function MitraOrderDetailClient() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<MitraOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeAttestation, setCompleteAttestation] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [disputeReason, setDisputeReason] = useState('');


  const fetchOrder = useCallback(async () => {
    const res = await fetchAPI<MitraOrderDetail | { data: MitraOrderDetail }>(`/orders/${orderId}`);
    if (res.success && res.data) {
      const payload = res.data;
      setOrder('data' in payload && payload.data ? payload.data : (payload as MitraOrderDetail));
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (!isAuthenticated || !orderId) return;
    void fetchOrder();
  }, [isAuthenticated, user?.active_role, orderId, fetchOrder]);

  const handleChat = async () => {
    if (!order?.customer_info?.id) return;
    setIsChatLoading(true);
    try {
      const res = await fetchAPI<{ room_id: string }>('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({ customer_id: order.customer_info.id }),
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
    return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
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
          <Button onClick={() => router.push('/mitra/orders')}>Kembali ke Daftar</Button>
        </div>
      </div>
    );
  }

  const status = order.status;
  const hero = HERO[status] ?? HERO.WAITING_CONFIRMATION;
  const step = currentStep(status);
  const offTrack = status === 'CANCELLED' || status === 'DISPUTED';

  // Pendapatan mitra dihitung defensif: bila backend tidak mengirim
  // platform_fee / partner_amount, nilainya diestimasi dengan rumus yang sama
  // seperti backend (utils.CalculateCompensation). Prinsip utama: JANGAN PERNAH
  // menampilkan total_amount (bruto yang dibayar pelanggan) sebagai pendapatan mitra.
  const paidServiceFee = (order.additional_fees ?? [])
    .filter(f => f.status === 'PAID' && f.type === 'service')
    .reduce((sum, f) => sum + f.total, 0);
  const paidMaterialFee = (order.additional_fees ?? [])
    .filter(f => f.status === 'PAID' && f.type === 'material')
    .reduce((sum, f) => sum + f.total, 0);
  const platformFee = order.platform_fee ??
    Math.round(((order.total_service_price ?? 0) + paidServiceFee) * 0.12);
  const partnerNet = order.partner_amount ?? Math.max(
    (order.total_service_price ?? 0) + paidServiceFee - platformFee + paidMaterialFee + (order.transport_fee ?? 0),
    0,
  );

  const pendingFees = (order.additional_fees ?? []).filter(f => f.status === 'PENDING');

  const timeline = [
    { label: 'Pesanan masuk', at: order.created_at },
    { label: 'Kamu menerima pesanan', at: order.confirmed_at },
    { label: 'Pembayaran diterima', at: order.paid_at },
    { label: 'Kamu mulai bekerja', at: order.started_at },
    { label: 'Kamu tandai selesai', at: order.completed_at },
    { label: 'Sengketa dibuka', at: order.disputed_at },
  ].filter((t): t is { label: string; at: string } => Boolean(t.at));

  const hasActions = ['WAITING_CONFIRMATION', 'PAID', 'IN_PROGRESS', 'WAITING_CUSTOMER_CONFIRM', 'DISPUTED', 'WAITING_ADDITIONAL_PAY']
    .includes(status as string);

  /* Aksi dipakai dua kali: bottom bar (mobile) & sidebar (desktop).
     Kolom, bukan baris: tiap status menyusun barisnya sendiri sehingga tombol
     tidak pernah berebut ruang. Chat tidak diulang — sudah ada di kartu Pemesan. */
  const actions = (
    <>
      {status === 'WAITING_CONFIRMATION' && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded-lg" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>
            Tolak
          </Button>
          <Button className="flex-1 bg-[#38A169] hover:bg-[#2F855A] rounded-lg" onClick={() => setShowAcceptModal(true)} disabled={actionLoading}>
            Terima
          </Button>
        </div>
      )}

      {status === 'PAID' && (
        <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded-lg" onClick={() => handleAction('start')} disabled={actionLoading}>
          Mulai Kerjakan
        </Button>
      )}

      {status === 'IN_PROGRESS' && (
        <>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-[#e5e2e1] text-[#5b403e] rounded-lg" onClick={() => router.push(`/mitra/orders/${order.id}/additional-fee`)} disabled={actionLoading}>
              + Biaya Tambahan
            </Button>
            <Button className="flex-1 bg-[#38A169] hover:bg-[#2F855A] rounded-lg" onClick={() => { setCompleteAttestation(false); setShowCompleteModal(true); }} disabled={actionLoading}>
              Selesai
            </Button>
          </div>
          <Button variant="outline" className="w-full border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 rounded-lg flex items-center justify-center gap-2" onClick={() => setShowDisputeModal(true)} disabled={actionLoading}>
            <AlertTriangle className="w-4 h-4" /> Lapor Masalah
          </Button>
        </>
      )}

      {status === 'WAITING_ADDITIONAL_PAY' && (
        <Button variant="outline" className="w-full border-[#e5e2e1] text-[#5b403e] rounded-lg" disabled>
          Menunggu Pembayaran Biaya Tambahan
        </Button>
      )}

      {status === 'WAITING_CUSTOMER_CONFIRM' && (
        <Button variant="outline" className="w-full border-[#e5e2e1] text-[#5b403e] rounded-lg" disabled>
          Menunggu Konfirmasi Pelanggan
        </Button>
      )}

      {status === 'DISPUTED' && (
        <Button
          className="w-full bg-[#b51822] hover:bg-[#90121a] rounded-lg flex items-center justify-center gap-2"
          onClick={async () => {
            const id = await createSupportThread({
              category: 'other',
              description: `Halo CS Posko Jasa, saya mitra dan melaporkan masalah pada Pesanan #${order.order_number}.`,
            });
            if (id) router.push(`/bantuan/${id}`);
          }}
        >
          Hubungi CS
        </Button>
      )}
    </>
  );

  /* Rincian pendapatan — kartu terpenting bagi mitra, jadi ia yang sticky
     di kolom kanan pada desktop. */
  const earningsCard = (
    <Section title="Rincian Pendapatan" icon={Wallet}>
      {order.total_service_price !== undefined && (
        <div className="flex justify-between text-sm text-[#5b403e]">
          <span>Nilai Jasa (dasar komisi)</span>
          <span className="text-[#1c1b1b]">{formatPrice(order.total_service_price + paidServiceFee)}</span>
        </div>
      )}

      <div className="mt-1 flex justify-between text-sm text-[#E53E3E]">
        {/* Nilai komisi diambil dari backend (order.platform_fee); persentase tidak
            di-hardcode di label agar tetap benar bila rate platform berubah. */}
        <span>Komisi Platform</span>
        <span>− {formatPrice(platformFee)}</span>
      </div>

      {paidMaterialFee > 0 && (
        <div className="mt-1 flex justify-between text-sm text-[#5b403e]">
          <span>Biaya Material</span>
          <span className="text-[#1c1b1b]">+ {formatPrice(paidMaterialFee)}</span>
        </div>
      )}

      {order.transport_fee !== undefined && order.transport_fee > 0 && (
        <div className="mt-1 flex justify-between text-sm text-[#5b403e]">
          <span>Biaya Transport</span>
          <span className="text-[#1c1b1b]">+ {formatPrice(order.transport_fee)}</span>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-dashed border-[#e5e2e1] flex justify-between font-bold text-base">
        <span className="text-[#1c1b1b]">
          {status === 'COMPLETED' ? 'Pendapatan Bersih' : 'Estimasi Pendapatan'}
        </span>
        <span className="text-[#b51822]">{formatPrice(partnerNet)}</span>
      </div>

      {order.partner_amount_estimated && (
        <p className="mt-1.5 text-xs text-[#9e8e8c] flex items-start gap-1">
          <Clock className="w-3 h-3 mt-0.5 shrink-0" />
          Angka estimasi — dikonfirmasi saat pesanan selesai.
        </p>
      )}
    </Section>
  );

  return (
    <div className="page-h bg-[#f7f5f4] pb-40 lg:pb-10">

      <div className="bg-white border-b border-[#e5e2e1] px-4 py-3 sticky top-0 z-30 lg:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/mitra/orders')} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded-lg" aria-label="Kembali">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#1c1b1b] leading-tight">Detail Pesanan</h1>
            <p className="text-xs text-[#9e8e8c] truncate">{order.order_number}</p>
          </div>
          <button
            onClick={async () => {
              const id = await createSupportThread({ category: 'other', description: `Halo CS Posko Jasa, saya (mitra) butuh bantuan terkait Pesanan #${order.order_number}.` });
              if (id) router.push(`/bantuan/${id}`);
            }}
            className="ml-auto flex items-center gap-1 p-2 -mr-2 rounded-lg text-[#5b403e] hover:bg-[#f7f5f4]"
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
            <h1 className="text-2xl font-bold text-[#1c1b1b]">Detail Pesanan</h1>
            <p className="text-sm text-[#9e8e8c] mt-1">{order.order_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-lg border-[#e5e2e1] text-[#5b403e]"
              onClick={async () => {
                const id = await createSupportThread({ category: 'other', description: `Halo CS Posko Jasa, saya (mitra) butuh bantuan terkait Pesanan #${order.order_number}.` });
                if (id) router.push(`/bantuan/${id}`);
              }}
            >
              <HelpCircle className="w-4 h-4 mr-1.5" /> Bantuan
            </Button>
            <Button variant="outline" className="rounded-lg border-[#e5e2e1] text-[#5b403e]" onClick={() => router.push('/mitra/orders')}>
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

            {status === 'WAITING_CONFIRMATION' && order.confirmation_expired_at && (
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center shrink-0">
                <p className="text-[11px] text-white/80 mb-0.5">Jawab sebelum</p>
                <CountdownTimer
                  targetDate={order.confirmation_expired_at}
                  format="mm:ss"
                  criticalThresholdSeconds={300}
                  onExpire={fetchOrder}
                  className="!text-white text-lg"
                />
              </div>
            )}
            {status === 'WAITING_PAYMENT' && order.payment_expired_at && (
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center shrink-0">
                <p className="text-[11px] text-white/80 mb-0.5">Batas bayar pelanggan</p>
                <CountdownTimer
                  targetDate={order.payment_expired_at}
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
                  {' '}· dibatalkan oleh {
                    order.cancelled_by === 'PARTNER' ? 'kamu'
                    : order.cancelled_by === 'CUSTOMER' ? 'pelanggan'
                    : 'sistem'
                  }
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
                      <div className={`absolute top-[11px] right-1/2 w-full h-0.5 ${i <= step ? 'bg-[#38A169]' : 'bg-[#e5e2e1]'}`} aria-hidden />
                    )}
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                      done ? 'bg-[#38A169] border-[#38A169] text-white'
                      : active ? 'bg-white border-[#b51822] text-[#b51822]'
                      : 'bg-white border-[#e5e2e1] text-[#9e8e8c]'
                    }`}>
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

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-5 lg:items-start space-y-4 lg:space-y-0">
          <div className="space-y-4">
            {/* Pemesan */}
            {order.customer_info && (
              <Section title="Pemesan" icon={User}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#e5e2e1] flex items-center justify-center text-lg font-bold text-[#5b403e] shrink-0 overflow-hidden">
                    {order.customer_info.avatar_url
                      ? <img src={order.customer_info.avatar_url} alt={order.customer_info.name} className="w-full h-full object-cover" />
                      : getInitial(order.customer_info.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1c1b1b] truncate">{order.customer_info.name}</p>
                    {order.customer_info.username && (
                      <p className="text-xs text-[#9e8e8c] truncate">@{order.customer_info.username}</p>
                    )}
                    {order.customer_info.phone_masked && (
                      <p className="text-xs text-[#9e8e8c] flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {order.customer_info.phone_masked}
                        <span className="text-[#c9bcba]">· chat untuk menghubungi</span>
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs border-[#e5e2e1] text-[#5b403e] rounded-lg shrink-0"
                    onClick={handleChat}
                    disabled={isChatLoading}
                  >
                    {isChatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    Chat
                  </Button>
                </div>
              </Section>
            )}

            {/* Jadwal & lokasi */}
            <Section title="Jadwal & Lokasi" icon={MapPin}>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-sm">
                  <Calendar className="w-4 h-4 text-[#b51822] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[#1c1b1b]">{formatDate(order.scheduled_at)}</p>
                    <p className="text-xs text-[#9e8e8c] mt-0.5">Waktu kamu dijadwalkan datang</p>
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
                {/* Peta koordinat alamat pelanggan (snapshot saat order dibuat). */}
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
                <div className="mt-3 pt-3 border-t border-[#e5e2e1]">
                  <p className="text-xs text-[#9e8e8c] mb-1">Catatan dari pelanggan</p>
                  <p className="text-sm text-[#1c1b1b]">{order.notes}</p>
                </div>
              )}

              {order.photos && order.photos.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#e5e2e1]">
                  <p className="text-xs text-[#9e8e8c] mb-2">Foto dari pelanggan</p>
                  <div className="flex gap-2 flex-wrap">
                    {order.photos.map((photo, i) => (
                      <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                        <img src={photo} alt={`Foto pesanan ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-[#e5e2e1] hover:opacity-90 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Layanan */}
            <Section title="Layanan Dipesan" icon={ClipboardList}>
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
                            <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {formatDuration(item.duration)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#1c1b1b] shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Biaya tambahan */}
            {order.additional_fees && order.additional_fees.length > 0 && (
              <Section title="Biaya Tambahan" icon={AlertTriangle}>
                <div className="space-y-2">
                  {order.additional_fees.map(fee => (
                    <div key={fee.id} className="flex justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${
                          fee.status === 'REJECTED' ? 'text-[#9e8e8c] line-through'
                          : fee.status === 'PENDING' ? 'text-[#DD6B20]' : 'text-[#1c1b1b]'
                        }`}>
                          {fee.item_name}
                          <span className="ml-1 text-xs font-normal">({fee.quantity}× {formatPrice(fee.price)})</span>
                        </p>
                        <p className="text-xs text-[#9e8e8c]">
                          {fee.type === 'material' ? 'Material' : 'Jasa'} · {ADDITIONAL_FEE_LABEL[fee.status] ?? fee.status}
                        </p>
                      </div>
                      <span className={`font-medium shrink-0 ${
                        fee.status === 'REJECTED' ? 'text-[#9e8e8c] line-through'
                        : fee.status === 'PENDING' ? 'text-[#DD6B20]' : 'text-[#1c1b1b]'
                      }`}>
                        + {formatPrice(fee.total)}
                      </span>
                    </div>
                  ))}
                </div>
                {pendingFees.length > 0 && (
                  <p className="mt-3 pt-3 border-t border-[#e5e2e1] text-xs text-[#DD6B20]">
                    {pendingFees.length} tagihan menunggu keputusan pelanggan. Biaya jasa tambahan kena komisi 12%; material dibayar penuh ke kamu.
                  </p>
                )}
              </Section>
            )}

            {/* Yang dibayar pelanggan — konteks, bukan pendapatan mitra */}
            <Section title="Yang Dibayar Pelanggan" icon={Wallet}>
              <div className="space-y-1.5 text-sm">
                {order.total_service_price !== undefined && (
                  <div className="flex justify-between text-[#5b403e]">
                    <span>Subtotal Jasa</span>
                    <span className="text-[#1c1b1b]">{formatPrice(order.total_service_price)}</span>
                  </div>
                )}
                {order.promo_discount !== undefined && order.promo_discount > 0 && (
                  <div className="flex justify-between text-[#38A169]">
                    <span>Diskon Promo</span>
                    <span>− {formatPrice(order.promo_discount)}</span>
                  </div>
                )}
                {order.transport_fee !== undefined && (
                  <div className="flex justify-between text-[#5b403e]">
                    <span>Biaya Transport</span>
                    <span className="text-[#1c1b1b]">{order.transport_fee === 0 ? 'Gratis' : formatPrice(order.transport_fee)}</span>
                  </div>
                )}
                {order.admin_fee !== undefined && order.admin_fee > 0 && (
                  <div className="flex justify-between text-[#9e8e8c] text-sm">
                    <span className="italic">Biaya Layanan (ditanggung pelanggan)</span>
                    <span>{formatPrice(order.admin_fee)}</span>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-[#e5e2e1] flex justify-between font-semibold">
                  <span className="text-[#1c1b1b]">Total Dibayar Pelanggan</span>
                  <span className="text-[#1c1b1b]">{formatPrice(order.total_amount)}</span>
                </div>
                {order.refunded_amount !== undefined && order.refunded_amount > 0 && (
                  <div className="flex justify-between text-[#38A169] font-medium border-t border-[#e5e2e1] pt-2 mt-2">
                    <span>Dikembalikan ke pelanggan</span>
                    <span>{formatPrice(order.refunded_amount)}</span>
                  </div>
                )}
              </div>
            </Section>

            {/* Ulasan pelanggan */}
            {order.review && (
              <Section title="Ulasan Pelanggan" icon={Star}>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= order.review!.rating ? 'fill-[#D69E2E] text-[#D69E2E]' : 'text-[#e5e2e1]'}`} />
                  ))}
                  <span className="text-sm text-[#5b403e] ml-1">{order.review.rating}/5</span>
                  <span className="text-xs text-[#9e8e8c] ml-auto">{formatShort(order.review.created_at)}</span>
                </div>
                {order.review.comment && <p className="text-sm text-[#1c1b1b]">&ldquo;{order.review.comment}&rdquo;</p>}
                {order.review.image_urls && order.review.image_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {order.review.image_urls.map((img, i) => (
                      <img key={i} src={img} alt={`Foto ulasan ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-[#e5e2e1]" />
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* Info + riwayat */}
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

          {/* Kolom kanan (desktop): pendapatan + aksi, ikut scroll */}
          <div className="space-y-4 lg:sticky lg:top-20">
            {earningsCard}
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
          <div className="flex flex-col gap-2">{actions}</div>
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-[#1c1b1b] mb-2">Terima Pesanan?</h3>
            <p className="text-sm text-[#5b403e] mb-4">
              Pastikan kamu siap mengerjakan pesanan sesuai jadwal dan harga yang disepakati.
            </p>
            <div className="bg-[#f7f5f4] rounded-lg p-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5b403e]">Estimasi pendapatanmu</span>
                <span className="font-bold text-[#b51822]">{formatPrice(partnerNet)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-[#e5e2e1] text-[#5b403e]" onClick={() => setShowAcceptModal(false)} disabled={actionLoading}>Batal</Button>
              <Button className="flex-1 bg-[#38A169] hover:bg-[#2F855A]" onClick={() => handleAction('confirm')} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Terima'}
              </Button>
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
              <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-gray-100 rounded-full" aria-label="Tutup">
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
              <button onClick={() => setShowDisputeModal(false)} className="p-2 -mr-2 text-[#9e8e8c] hover:text-[#5b403e]" aria-label="Tutup">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-sm text-[#5b403e]">
                Pesanan akan dihentikan sementara (Dispute) dan tim CS akan menengahinya. Berikan alasan masalahmu:
              </p>
              <textarea
                className="w-full border border-[#e5e2e1] rounded-lg p-3 text-sm focus:outline-none focus:border-[#b51822]"
                placeholder="Tuliskan kendala kamu secara detail..."
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

      {/* Modal Konfirmasi Selesai — mitra harus beratestasi sebelum complete */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center">
          <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-[#1c1b1b]">Tandai Pekerjaan Selesai</h3>
              <button onClick={() => setShowCompleteModal(false)} className="p-2 -mr-2 text-[#9e8e8c] hover:text-[#5b403e]" aria-label="Tutup">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[#5b403e] mb-4">
              Setelah ditandai selesai, pelanggan akan diminta mengkonfirmasi hasil pekerjaan. Dana akan cair setelah pelanggan mengkonfirmasi (atau otomatis dalam 24 jam).
            </p>

            <div className="p-3 bg-[#FFFBEB] border border-[#F6E05E] rounded-lg mb-4">
              <p className="text-xs text-[#744210] font-medium mb-1">💡 Tips:</p>
              <p className="text-xs text-[#5b403e]">Pastikan kamu sudah mengambil foto hasil pekerjaan sebagai bukti. Upload di bagian foto pesanan jika diperlukan.</p>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={completeAttestation}
                onChange={e => setCompleteAttestation(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#38A169] shrink-0"
              />
              <span className="text-sm text-[#5b403e]">
                Saya menyatakan pekerjaan sudah <strong>selesai sepenuhnya</strong> sesuai permintaan pelanggan.
              </span>
            </label>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-lg border-[#e5e2e1]" onClick={() => setShowCompleteModal(false)}>
                Batal
              </Button>
              <Button
                className="flex-1 bg-[#38A169] hover:bg-[#2F855A] rounded-lg"
                disabled={!completeAttestation || actionLoading}
                onClick={() => { setShowCompleteModal(false); handleAction('complete'); }}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Selesai'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
