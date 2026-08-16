"use client";
import { useToast } from '@/components/ui/toast';

import { getInitial } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  MessageSquare, MapPin, Calendar, Clock, Loader2,
  AlertTriangle, Check, Copy, ClipboardList, Wallet, Star, User, HelpCircle, Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { fetchAPI } from '@/lib/api';
import { track } from '@/lib/analytics';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useChatRooms } from '@/hooks/useChatRooms';

import { PageSkeleton } from '@/components/ui/skeleton';
import OrderHelpModal from '@/components/order/OrderHelpModal';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import MitraModal from '@/components/mitra/MitraModal';
import { getErrorMessage } from '@/types/api';
import { usePlatformConfig, formatFeeRate } from '@/hooks/usePlatformConfig';
import dynamic from 'next/dynamic';
import Image from 'next/image';

// Peta hanya di klien (butuh window/Google Maps) → hindari SSR.
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// Bentuk field mengikuti OrderDetailDTO di backend (internal/order/dto.go).
interface MitraOrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  // Pendapatan mitra setelah potongan platform . bukan total_amount, yang
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
  district?: string;
  city?: string;
  province?: string;
  service_lat?: number;
  service_lon?: number;
  notes?: string;
  photos?: string[];
  // Snapshot persyaratan saat pesanan dibuat . apa yang DIJANJIKAN pelanggan.
  // Ini bukti bila di lokasi ternyata tidak tersedia; jangan dibaca ulang dari
  // layanan, karena mitra bisa mengubah persyaratannya setelah order jalan.
  requirements?: {
    code?: string;
    label: string;
    hint?: string;
    note?: string;
    is_mandatory: boolean;
  }[];
  requirements_ack_at?: string;
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

/** Hero per status, ditulis dari sudut pandang MITRA . apa yang terjadi dan
 *  apa yang harus mitra lakukan sekarang. */
const HERO: Record<OrderStatus, { tone: string; title: string; desc: string }> = {
  WAITING_CONFIRMATION: {
    tone: 'from-brand-warning to-brand-amber-dark',
    title: 'Pesanan baru menunggu jawabanmu',
    desc: 'Terima atau tolak sebelum waktu habis. Tanpa respons, pesanan batal otomatis.',
  },
  WAITING_PAYMENT: {
    tone: 'from-brand-orange to-brand-orange-dark',
    title: 'Pesanan baru . menunggu pembayaran',
    desc: 'Jadwalmu sudah dikunci. Begitu pembayaran masuk, kamu wajib mengerjakannya sesuai jadwal.',
  },
  PAID: {
    tone: 'from-brand-info to-brand-info-dark',
    title: 'Sudah dibayar - siap dikerjakan',
    desc: 'Dana ditahan aman oleh Posko Jasa. Datang sesuai jadwal, lalu tekan "Mulai Kerjakan".',
  },
  IN_PROGRESS: {
    tone: 'from-brand-purple to-brand-purple',
    title: 'Sedang kamu kerjakan',
    desc: 'Tekan "Selesai" bila pekerjaan rampung. Butuh material tambahan? Ajukan biaya tambahan.',
  },
  WAITING_ADDITIONAL_PAY: {
    tone: 'from-brand-orange to-brand-orange-dark',
    title: 'Menunggu persetujuan biaya tambahan',
    desc: 'Pekerjaan tertahan sampai pelanggan menyetujui atau menolak tagihan tambahanmu.',
  },
  WAITING_CUSTOMER_CONFIRM: {
    tone: 'from-brand-blue-dark to-brand-purple-dark',
    title: 'Menunggu konfirmasi pelanggan',
    desc: 'Bila pelanggan tidak merespons dalam 24 jam, dana cair otomatis ke saldomu.',
  },
  COMPLETED: {
    tone: 'from-brand-success to-brand-success-dark',
    title: 'Pesanan selesai',
    desc: 'Pendapatan sudah masuk ke saldomu.',
  },
  CANCELLED: {
    tone: 'from-brand-slate to-brand-slate',
    title: 'Pesanan dibatalkan',
    desc: 'Pesanan ini sudah tidak berjalan dan jadwalmu kembali terbuka.',
  },
  DISPUTED: {
    tone: 'from-brand-error to-brand-error-dark',
    title: 'Pesanan dalam sengketa',
    desc: 'Dana dibekukan hingga Tim CS menyelesaikan sengketa (maks. 3×24 jam).',
  },
};

/** Skema bayar-langsung: tidak ada lagi langkah "Diterima" . mitra tidak
 *  mengkonfirmasi pesanan baru, jadi tracker tidak boleh mencentangnya. */
const STEPS = ['Masuk', 'Dibayar', 'Dikerjakan', 'Selesai'] as const;

function currentStep(status: OrderStatus): number {
  switch (status) {
    // Order historis masih bisa tertinggal di WAITING_CONFIRMATION . perlakukan
    // sama dengan menunggu bayar, karena keduanya belum menghasilkan uang masuk.
    case 'WAITING_CONFIRMATION':
    case 'WAITING_PAYMENT': return 0;
    case 'PAID': return 1;
    case 'IN_PROGRESS':
    case 'WAITING_ADDITIONAL_PAY': return 2;
    case 'WAITING_CUSTOMER_CONFIRM': return 3;
    case 'COMPLETED': return 4;
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
    <section className={`bg-white rounded-lg border border-brand-gray-100 p-3 sm:p-5 ${className}`}>
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

export default function MitraOrderDetailClient() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<MitraOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const platformConfig = usePlatformConfig();
  const { showToast } = useToast();
  const [isChatLoading, setIsChatLoading] = useState(false);
  // Pesan belum dibaca dari pelanggan pesanan ini (realtime lewat ChatProvider).
  const { data: chatRooms } = useChatRooms();

  const [copied, setCopied] = useState(false);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeAttestation, setCompleteAttestation] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
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
        router.push(`/mitra/chat/${res.data.room_id}`);
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
    // Tiga event, bukan satu: selisih attempted−succeeded ADALAH tingkat
    // kegagalan aksi mitra, dan itu tidak bisa dihitung dari event sukses saja.
    track('partner_order_action_attempted', { action, order_id: orderId });
    let res;

    if (action === 'reject') {
      res = await fetchAPI(`/orders/${orderId}/reject`, { method: 'PUT', body: JSON.stringify({ reason: rejectReason }) });
    } else if (action === 'cancel') {
      res = await fetchAPI(`/orders/${orderId}/cancel`, { method: 'PUT', body: JSON.stringify({ reason: cancelReason }) });
    } else if (action === 'dispute') {
      res = await fetchAPI(`/orders/${orderId}/dispute`, { method: 'PUT', body: JSON.stringify({ reason: disputeReason }) });
    } else {
      res = await fetchAPI(`/orders/${orderId}/${action}`, { method: 'PUT', body: JSON.stringify(body ?? {}) });
    }

    if (res.success) {
      track('partner_order_action_succeeded', { action, order_id: orderId });
      showToast('Berhasil!');
      if (action === 'accept' || action === 'confirm') setShowAcceptModal(false);
      if (action === 'reject') setShowRejectModal(false);
      if (action === 'cancel') setShowCancelModal(false);
      if (action === 'dispute') setShowDisputeModal(false);
      await fetchOrder();
    } else {
      // `code` dari backend, BUKAN pesan yang sudah diterjemahkan . pesan
      // berubah kapan saja, kode tidak, dan hanya kode yang bisa dikelompokkan.
      track('partner_order_action_failed', { action, order_id: orderId, code: res.code ?? null });
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
    return <PageSkeleton />;
  }
  if (!isAuthorized) return null;

  // Header nyata untuk cabang memuat & tidak-ditemukan (pola dari
  // mitra/kyc/page.tsx): tombol kembali langsung berfungsi, bukan bilah palsu.
  // Nomor pesanan belum ada di kedua cabang itu, jadi subtitle & remah roti
  // memakai label netral.
  const header = (
    <MitraPageHeader
      title="Detail Pesanan"
      variant="detail"
      backHref="/mitra/orders"
      breadcrumbs={[{ label: 'Pesanan', href: '/mitra/orders' }, { label: 'Detail' }]}
    />
  );

  if (loading) {
    return (
      <div className="pb-20">
        {header}
        <MitraPageContainer variant="detail" className="space-y-4">
          <div className="h-28 bg-brand-gray-100 rounded-lg animate-pulse" />
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-brand-gray-100 p-3 animate-pulse">
              <div className="h-4 w-3/4 bg-brand-gray-100 rounded-md mb-3" />
              <div className="h-4 w-1/2 bg-brand-gray-100 rounded-md" />
            </div>
          ))}
        </MitraPageContainer>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="pb-20">
        {header}
        <MitraPageContainer variant="detail">
          <div className="rounded-lg border border-brand-gray-100 bg-white py-10 text-center">
            <p className="text-brand-gray-700 mb-4">Pesanan tidak ditemukan.</p>
            <Button onClick={() => router.push('/mitra/orders')}>Kembali ke Daftar</Button>
          </div>
        </MitraPageContainer>
      </div>
    );
  }

  const status = order.status;
  const hero = HERO[status] ?? HERO.WAITING_CONFIRMATION;
  const step = currentStep(status);
  const offTrack = status === 'CANCELLED' || status === 'DISPUTED';

  // chat_rooms.customer_id = USER id pelanggan; cocokkan dengan customer_info.id.
  const customerUserId = order.customer_info?.id;
  const chatUnread = customerUserId
    ? (chatRooms?.find((r) => r.customer_id === customerUserId)?.unread_count ?? 0)
    : 0;

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
  // Tarif komisi dari platform_settings, BUKAN konstanta: admin bisa
  // mengubahnya kapan saja dan estimasi ini menampilkan rupiah ke mitra.
  const platformFee = order.platform_fee ??
    Math.round(((order.total_service_price ?? 0) + paidServiceFee) * platformConfig.platform_fee_rate);
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

  const hasActions = ['WAITING_PAYMENT', 'WAITING_CONFIRMATION', 'PAID', 'IN_PROGRESS', 'WAITING_CUSTOMER_CONFIRM', 'DISPUTED', 'WAITING_ADDITIONAL_PAY']
    .includes(status as string);

  /* Aksi dipakai dua kali: bottom bar (mobile) & sidebar (desktop).
     Kolom, bukan baris: tiap status menyusun barisnya sendiri sehingga tombol
     tidak pernah berebut ruang. Chat tidak diulang . sudah ada di kartu Pemesan. */
  const actions = (
    <>
      {/* Pra-bayar: backend MENGIZINKAN mitra membatalkan (order/service.go .
          WAITING_PAYMENT ada di cabang yang sama dengan WAITING_CONFIRMATION),
          tapi UI tidak pernah menyediakan tombolnya. Akibatnya slot mitra
          terkunci sampai timeout 1 jam, dan . lebih buruk . mitra yang ingin
          menolak pekerjaan justru diuntungkan dengan MENDIAMKANNYA: strike
          hanya jatuh pada pembatalan, tidak pada timeout. Aturan yang
          menghukum kejujuran memproduksi mitra yang menghilang. */}
      {status === 'WAITING_PAYMENT' && (
        <Button
          variant="outline"
          className="w-full border-brand-error text-brand-error hover:bg-brand-error-soft rounded-lg"
          onClick={() => setShowCancelModal(true)}
          disabled={actionLoading}
        >
          Batalkan Pesanan
        </Button>
      )}

      {status === 'WAITING_CONFIRMATION' && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-brand-error text-brand-error hover:bg-brand-error-soft rounded-lg" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>
            Tolak
          </Button>
          <Button className="flex-1 bg-brand-success hover:bg-brand-success-dark rounded-lg" onClick={() => setShowAcceptModal(true)} disabled={actionLoading}>
            Terima
          </Button>
        </div>
      )}

      {status === 'PAID' && (() => {
        // Tak ada batas awal: mitra boleh mulai lebih cepat dari jadwal bila
        // sudah sepakat dengan pelanggan. Yang dibatasi hanya sisi akhir .
        // H+12 jam, setelah itu pesanan masuk pemeriksaan no-show
        // (backend validateStartWindow).
        const scheduled = new Date(order.scheduled_at);
        const startLatest = new Date(scheduled.getTime() + 12 * 60 * 60 * 1000);
        const expired = new Date() > startLatest;
        const early = new Date() < scheduled;
        return (
          <div>
            <Button
              className="w-full bg-brand-red hover:bg-brand-red-dark rounded-lg"
              onClick={() => handleAction('start')}
              disabled={actionLoading || expired}
            >
              Mulai Kerjakan
            </Button>
            {expired ? (
              <p className="mt-1.5 text-xs text-brand-error text-center">
                Batas mulai sudah lewat ({formatDate(startLatest.toISOString())}). Hubungi CS.
              </p>
            ) : early ? (
              <p className="mt-1.5 text-xs text-brand-gray-450 text-center">
                Lebih cepat dari jadwal ({formatDate(order.scheduled_at)}). Pastikan pelanggan sudah setuju.
              </p>
            ) : null}
          </div>
        );
      })()}

      {status === 'IN_PROGRESS' && (
        <>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-brand-gray-100 text-brand-gray-700 rounded-lg" onClick={() => router.push(`/mitra/orders/${order.id}/additional-fee`)} disabled={actionLoading}>
              + Biaya Tambahan
            </Button>
            <Button className="flex-1 bg-brand-success hover:bg-brand-success-dark rounded-lg" onClick={() => { setCompleteAttestation(false); setShowCompleteModal(true); }} disabled={actionLoading}>
              Selesai
            </Button>
          </div>
          <Button variant="outline" className="w-full border-brand-error text-brand-error hover:bg-brand-error-soft rounded-lg flex items-center justify-center gap-2" onClick={() => setShowDisputeModal(true)} disabled={actionLoading}>
            <AlertTriangle className="w-4 h-4" /> Lapor Masalah
          </Button>
        </>
      )}

      {status === 'WAITING_ADDITIONAL_PAY' && (
        <Button variant="outline" className="w-full border-brand-gray-100 text-brand-gray-700 rounded-lg" disabled>
          Menunggu Pembayaran Biaya Tambahan
        </Button>
      )}

      {status === 'WAITING_CUSTOMER_CONFIRM' && (
        <Button variant="outline" className="w-full border-brand-gray-100 text-brand-gray-700 rounded-lg" disabled>
          Menunggu Konfirmasi Pelanggan
        </Button>
      )}

      {status === 'DISPUTED' && (
        <Button
          className="w-full bg-brand-red hover:bg-brand-red-dark rounded-lg flex items-center justify-center gap-2"
          onClick={async () => {
            const res = await fetchAPI<{ id: string }>(`/disputes/order/${order.id}`);
            if (res.success && res.data?.id) router.push(`/disputes/${res.data.id}`);
            else router.push('/mitra/bantuan/chat');
          }}
        >
          <Scale className="w-4 h-4" /> Buka Ruang Sengketa
        </Button>
      )}
    </>
  );

  /* Rincian pendapatan . kartu terpenting bagi mitra, jadi ia yang sticky
     di kolom kanan pada desktop. */
  const earningsCard = (
    <Section title="Rincian Pendapatan" icon={Wallet}>
      {order.total_service_price !== undefined && (
        <div className="flex justify-between text-sm text-brand-gray-700">
          <span>Nilai Layanan (dasar komisi)</span>
          <span className="text-brand-gray-900">{formatPrice(order.total_service_price + paidServiceFee)}</span>
        </div>
      )}

      <div className="mt-1 flex justify-between text-sm text-brand-error">
        {/* Nilai komisi diambil dari backend (order.platform_fee); persentase tidak
            di-hardcode di label agar tetap benar bila rate platform berubah. */}
        <span>Komisi Platform</span>
        <span>− {formatPrice(platformFee)}</span>
      </div>

      {paidMaterialFee > 0 && (
        <div className="mt-1 flex justify-between text-sm text-brand-gray-700">
          <span>Biaya Material</span>
          <span className="text-brand-gray-900">+ {formatPrice(paidMaterialFee)}</span>
        </div>
      )}

      {order.transport_fee !== undefined && order.transport_fee > 0 && (
        <div className="mt-1 flex justify-between text-sm text-brand-gray-700">
          <span>Biaya Transport</span>
          <span className="text-brand-gray-900">+ {formatPrice(order.transport_fee)}</span>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-dashed border-brand-gray-100 flex justify-between font-bold text-base">
        <span className="text-brand-gray-900">
          {status === 'COMPLETED' ? 'Pendapatan Bersih' : 'Estimasi Pendapatan'}
        </span>
        <span className="text-brand-red">{formatPrice(partnerNet)}</span>
      </div>

      {order.partner_amount_estimated && (
        <p className="mt-1.5 text-xs text-brand-gray-450 flex items-start gap-1">
          <Clock className="w-3 h-3 mt-0.5 shrink-0" />
          Angka estimasi - dikonfirmasi saat pesanan selesai.
        </p>
      )}
    </Section>
  );

  return (
    <div className="pb-40 lg:pb-10">

      {/* Satu header untuk semua breakpoint. Sebelumnya bilah mobile
          (`lg:hidden`) dan judul desktop (`hidden lg:flex`) ditulis terpisah,
          dan versi desktopnya kehilangan tombol kembali . padahal mode mitra
          tidak punya TopNavbar untuk menggantikannya. */}
      <MitraPageHeader
        title="Detail Pesanan"
        subtitle={order.order_number}
        variant="detail"
        backHref="/mitra/orders"
        breadcrumbs={[{ label: 'Pesanan', href: '/mitra/orders' }, { label: order.order_number }]}
        right={
          <Button
            variant="outline"
            size="sm"
            className="rounded-md border-brand-gray-100 text-brand-gray-700"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Bantuan</span>
          </Button>
        }
      />

      <MitraPageContainer variant="detail">
        {/* ── Status hero ─────────────────────────────────────────── */}
        <div className={`rounded-lg bg-gradient-to-br ${hero.tone} text-white p-4 sm:p-5 mb-3`}>
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
                      <div className={`absolute top-[11px] right-1/2 w-full h-0.5 ${i <= step ? 'bg-brand-success' : 'bg-brand-gray-100'}`} aria-hidden />
                    )}
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${done ? 'bg-brand-success border-brand-success text-white'
                        : active ? 'bg-white border-brand-red text-brand-red'
                          : 'bg-white border-brand-gray-100 text-brand-gray-450'
                      }`}>
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

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-5 lg:items-start space-y-4 lg:space-y-0">
          <div className="space-y-4">
            {/* Pemesan */}
            {order.customer_info && (
              <Section title="Pemesan" icon={User}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-gray-100 flex items-center justify-center text-lg font-bold text-brand-gray-700 shrink-0 overflow-hidden">
                    {order.customer_info.avatar_url
                      ? <Image src={order.customer_info.avatar_url} alt={order.customer_info.name} width={48} height={48} className="w-full h-full object-cover" />
                      : getInitial(order.customer_info.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-gray-900 truncate">{order.customer_info.name}</p>
                    {order.customer_info.username && (
                      <p className="text-xs text-brand-gray-450 truncate">@{order.customer_info.username}</p>
                    )}

                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="relative gap-1 text-xs border-brand-gray-100 text-brand-gray-700 rounded-lg shrink-0"
                    onClick={handleChat}
                    disabled={isChatLoading}
                  >
                    {isChatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    Chat
                    {chatUnread > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-red text-white text-[10px] font-bold flex items-center justify-center leading-none border-2 border-white">
                        {chatUnread > 99 ? '99+' : chatUnread}
                      </span>
                    )}
                  </Button>
                </div>
              </Section>
            )}

            {/* Jadwal & lokasi */}
            <Section title="Jadwal & Lokasi" icon={MapPin}>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-sm">
                  <Calendar className="w-4 h-4 text-brand-red mt-0.5 shrink-0" />
                  <div>
                    <p className="text-brand-gray-900">{formatDate(order.scheduled_at)}</p>
                    <p className="text-xs text-brand-gray-450 mt-0.5">Waktu kamu dijadwalkan datang</p>
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

              {(order.requirements?.length ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-brand-gray-100">
                  <p className="text-xs text-brand-gray-450 mb-2">
                    Yang dijanjikan pelanggan akan disiapkan
                  </p>
                  <ul className="space-y-1.5">
                    {order.requirements!.map((r, i) => (
                      <li key={r.code || `req-${i}`} className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${r.is_mandatory
                              ? 'bg-brand-warning-soft text-brand-warning-dark border border-brand-warning-border'
                              : 'bg-brand-gray-60 text-brand-gray-450'
                            }`}
                        >
                          {r.is_mandatory ? 'Wajib' : 'Disarankan'}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm text-brand-gray-900">{r.label}</span>
                          {r.note && (
                            <span className="block text-xs text-brand-gray-450">
                              Catatan Anda: {r.note}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-brand-gray-450">
                    {order.requirements_ack_at
                      ? `Disetujui pelanggan pada ${formatDate(order.requirements_ack_at)}`
                      : 'Pesanan ini dibuat sebelum persetujuan persyaratan diberlakukan.'}
                  </p>
                </div>
              )}

              {order.notes && (
                <div className="mt-3 pt-3 border-t border-brand-gray-100">
                  <p className="text-xs text-brand-gray-450 mb-1">Catatan dari pelanggan</p>
                  <p className="text-sm text-brand-gray-900">{order.notes}</p>
                </div>
              )}

              {order.photos && order.photos.length > 0 && (
                <div className="mt-3 pt-3 border-t border-brand-gray-100">
                  <p className="text-xs text-brand-gray-450 mb-2">Foto dari pelanggan</p>
                  <div className="flex gap-2 flex-wrap">
                    {order.photos.map((photo, i) => (
                      <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                        <Image src={photo} alt={`Foto pesanan ${i + 1}`} width={80} height={80} className="w-20 h-20 object-cover rounded-lg border border-brand-gray-100 hover:opacity-90 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Layanan */}
            <Section title="Layanan Dipesan" icon={ClipboardList}>
              <div className="divide-y divide-brand-gray-100">
                {order.items?.map(item => (
                  <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-14 h-14 rounded-lg bg-brand-gray-60 border border-brand-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.photo_url
                        ? <Image src={item.photo_url} alt={item.service_name} width={56} height={56} className="w-full h-full object-cover" />
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
                            <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {formatDuration(item.duration)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-brand-gray-900 shrink-0">
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
                        <p className={`font-medium truncate ${fee.status === 'REJECTED' ? 'text-brand-gray-450 line-through'
                            : fee.status === 'PENDING' ? 'text-brand-orange' : 'text-brand-gray-900'
                          }`}>
                          {fee.item_name}
                          <span className="ml-1 text-xs font-normal">({fee.quantity}× {formatPrice(fee.price)})</span>
                        </p>
                        <p className="text-xs text-brand-gray-450">
                          {fee.type === 'material' ? 'Material' : 'Layanan'} · {ADDITIONAL_FEE_LABEL[fee.status] ?? fee.status}
                        </p>
                      </div>
                      <span className={`font-medium shrink-0 ${fee.status === 'REJECTED' ? 'text-brand-gray-450 line-through'
                          : fee.status === 'PENDING' ? 'text-brand-orange' : 'text-brand-gray-900'
                        }`}>
                        + {formatPrice(fee.total)}
                      </span>
                    </div>
                  ))}
                </div>
                {pendingFees.length > 0 && (
                  <p className="mt-3 pt-3 border-t border-brand-gray-100 text-xs text-brand-orange">
                    {pendingFees.length} tagihan menunggu keputusan pelanggan. Biaya layanan tambahan kena komisi {formatFeeRate(platformConfig.platform_fee_rate)}; material dibayar penuh ke kamu.
                  </p>
                )}
              </Section>
            )}

            {/* Yang dibayar pelanggan . konteks, bukan pendapatan mitra */}
            <Section title="Yang Dibayar Pelanggan" icon={Wallet}>
              <div className="space-y-1.5 text-sm">
                {order.total_service_price !== undefined && (
                  <div className="flex justify-between text-brand-gray-700">
                    <span>Subtotal Layanan</span>
                    <span className="text-brand-gray-900">{formatPrice(order.total_service_price)}</span>
                  </div>
                )}
                {order.promo_discount !== undefined && order.promo_discount > 0 && (
                  <div className="flex justify-between text-brand-success">
                    <span>Diskon Promo</span>
                    <span>− {formatPrice(order.promo_discount)}</span>
                  </div>
                )}
                {order.transport_fee !== undefined && (
                  <div className="flex justify-between text-brand-gray-700">
                    <span>Biaya Transport</span>
                    <span className="text-brand-gray-900">{order.transport_fee === 0 ? 'Gratis' : formatPrice(order.transport_fee)}</span>
                  </div>
                )}
                {order.admin_fee !== undefined && order.admin_fee > 0 && (
                  <div className="flex justify-between text-brand-gray-450 text-sm">
                    <span className="italic">Biaya Layanan (ditanggung pelanggan)</span>
                    <span>{formatPrice(order.admin_fee)}</span>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-brand-gray-100 flex justify-between font-semibold">
                  <span className="text-brand-gray-900">Total Dibayar Pelanggan</span>
                  <span className="text-brand-gray-900">{formatPrice(order.total_amount)}</span>
                </div>
                {order.refunded_amount !== undefined && order.refunded_amount > 0 && (
                  <div className="flex justify-between text-brand-success font-medium border-t border-brand-gray-100 pt-2 mt-2">
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
                    <Star key={s} className={`w-4 h-4 ${s <= order.review!.rating ? 'fill-brand-warning text-brand-warning' : 'text-brand-gray-100'}`} />
                  ))}
                  <span className="text-sm text-brand-gray-700 ml-1">{order.review.rating}/5</span>
                  <span className="text-xs text-brand-gray-450 ml-auto">{formatShort(order.review.created_at)}</span>
                </div>
                {order.review.comment && <p className="text-sm text-brand-gray-900">&ldquo;{order.review.comment}&rdquo;</p>}
                {order.review.image_urls && order.review.image_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {order.review.image_urls.map((img, i) => (
                      <Image key={i} src={img} alt={`Foto ulasan ${i + 1}`} width={64} height={64} className="w-16 h-16 object-cover rounded-lg border border-brand-gray-100" />
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* Info + riwayat */}
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
                    <span className="text-xs text-brand-gray-450 shrink-0">{formatShort(t.at)}</span>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          {/* Kolom kanan (desktop): pendapatan + aksi, ikut scroll.
              lg:top-28 = tinggi MitraPageHeader (bilah judul + remah roti) plus
              sedikit jarak. Mode mitra tidak punya TopNavbar, tapi header
              halamannya `sticky top-0 z-10` . offset yang lebih kecil membuat
              kartu pendapatan berhenti DI BAWAH header dan tertutup olehnya. */}
          <div className="space-y-4 lg:sticky lg:top-28">
            {earningsCard}
            {hasActions && (
              <div className="hidden lg:block bg-white rounded-lg border border-brand-gray-100 p-4">
                <div className="flex flex-col gap-2">{actions}</div>
              </div>
            )}
          </div>
        </div>
      </MitraPageContainer>

      {/* Action bar mobile . z-40 = tangga z-index mode mitra (di bawah bottom
          nav z-50, di atas sidebar z-30). */}
      {hasActions && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-gray-100 px-4 py-3 z-40 lg:hidden pb-safe">
          <div className="flex flex-col gap-2">{actions}</div>
        </div>
      )}

      {/* Konfirmasi Hubungi Admin (tak lagi langsung kirim laporan) */}
      <OrderHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        orderNumber={order.order_number}
        isMitra
      />

      {/* Accept Modal */}
      <MitraModal
        open={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        title="Terima Pesanan?"
        description="Pastikan kamu siap mengerjakan pesanan sesuai jadwal dan harga yang disepakati."
        footer={
          <>
            <Button variant="outline" className="flex-1 rounded-md border-brand-gray-100 text-brand-gray-700" onClick={() => setShowAcceptModal(false)} disabled={actionLoading}>Batal</Button>
            <Button className="flex-1 rounded-md bg-brand-success hover:bg-brand-success-dark" onClick={() => handleAction('confirm')} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Terima'}
            </Button>
          </>
        }
      >
        <div className="mt-4 rounded-lg bg-brand-gray-60 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-gray-700">Estimasi pendapatanmu</span>
            <span className="font-bold text-brand-red">{formatPrice(partnerNet)}</span>
          </div>
        </div>
      </MitraModal>

      {/* Reject Modal */}
      <MitraModal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Tolak Pesanan"
        description="Silakan pilih alasan penolakan. Ini membantu kami meningkatkan kualitas layanan."
        size="lg"
        footer={
          <Button
            className="w-full rounded-md bg-brand-error hover:bg-brand-error-dark"
            disabled={!rejectReason || actionLoading}
            onClick={() => handleAction('reject', { reason: rejectReason })}
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Konfirmasi Tolak'}
          </Button>
        }
      >
        <div className="mt-4 space-y-2">
          {['Harga tidak sesuai', 'Jadwal bentrok', 'Di luar area layanan', 'Lainnya'].map(reason => (
            <button
              key={reason}
              type="button"
              aria-pressed={rejectReason === reason}
              className={`w-full text-left px-4 py-3 border rounded-md text-sm transition-colors ${rejectReason === reason ? 'border-brand-red bg-brand-error-soft text-brand-red font-medium' : 'border-brand-gray-100 text-brand-gray-900 hover:border-brand-gray-200'}`}
              onClick={() => setRejectReason(reason)}
            >
              {reason}
            </button>
          ))}
        </div>
      </MitraModal>

      {/* Cancel Modal (pra-bayar) . konsekuensinya disebutkan di muka.
          Mitra berhak tahu bahwa membatalkan itu berbiaya SEBELUM menekan
          tombolnya; kalau baru tahu sesudahnya, yang ia pelajari adalah
          "jangan pakai tombol ini", bukan "jangan batalkan seenaknya". */}
      <MitraModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Batalkan Pesanan Ini?"
        description="Pesanan belum dibayar, jadi tidak ada dana yang berpindah. Slot jadwalmu langsung terbuka kembali."
        size="lg"
        footer={
          <Button
            className="w-full rounded-md bg-brand-error hover:bg-brand-error-dark"
            disabled={!cancelReason || actionLoading}
            onClick={() => handleAction('cancel', { reason: cancelReason })}
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Batalkan Pesanan'}
          </Button>
        }
      >
        <div className="mt-4 rounded-lg border border-brand-warning-light bg-brand-warning-soft p-3 text-xs leading-relaxed text-brand-warning-dark">
          Pembatalan sepihak menambah <strong>1 strike</strong> pada akunmu. Tiga strike dalam 30
          hari membuat akun ditangguhkan 7 hari. Pada tahap ini pelanggan belum membayar, jadi
          tidak ada ulasan bintang 1 otomatis . berbeda dengan membatalkan setelah pembayaran masuk.
        </div>
        <div className="mt-3 space-y-2">
          {['Jadwal bentrok', 'Di luar area layanan', 'Sedang tidak bisa mengerjakan', 'Lainnya'].map(reason => (
            <button
              key={reason}
              type="button"
              aria-pressed={cancelReason === reason}
              className={`w-full text-left px-4 py-3 border rounded-md text-sm transition-colors ${cancelReason === reason ? 'border-brand-red bg-brand-error-soft text-brand-red font-medium' : 'border-brand-gray-100 text-brand-gray-900 hover:border-brand-gray-200'}`}
              onClick={() => setCancelReason(reason)}
            >
              {reason}
            </button>
          ))}
        </div>
      </MitraModal>

      {/* Dispute Modal */}
      <MitraModal
        open={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title="Lapor Masalah"
        description="Pesanan akan dihentikan sementara (Dispute) dan tim CS akan menengahinya. Berikan alasan masalahmu:"
        size="lg"
        footer={
          <Button
            className="w-full rounded-md bg-brand-error hover:bg-brand-error-dark text-white h-12 font-bold"
            disabled={!disputeReason.trim() || actionLoading}
            onClick={() => handleAction('dispute')}
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Kirim Laporan'}
          </Button>
        }
      >
        <textarea
          className="mt-4 w-full border border-brand-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-brand-red"
          placeholder="Tuliskan kendala kamu secara detail..."
          rows={4}
          value={disputeReason}
          onChange={e => setDisputeReason(e.target.value)}
        />
      </MitraModal>

      {/* Modal Konfirmasi Selesai . mitra harus beratestasi sebelum complete */}
      <MitraModal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Tandai Pekerjaan Selesai"
        description="Setelah ditandai selesai, pelanggan akan diminta mengkonfirmasi hasil pekerjaan. Dana akan cair setelah pelanggan mengkonfirmasi (atau otomatis dalam 24 jam)."
        footer={
          <>
            <Button variant="outline" className="flex-1 rounded-md border-brand-gray-100" onClick={() => setShowCompleteModal(false)}>
              Batal
            </Button>
            <Button
              className="flex-1 rounded-md bg-brand-success hover:bg-brand-success-dark"
              disabled={!completeAttestation || actionLoading}
              onClick={() => { setShowCompleteModal(false); handleAction('complete'); }}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Selesai'}
            </Button>
          </>
        }
      >
        <div className="mt-4 p-3 bg-brand-warning-soft border border-brand-warning-border rounded-md">
          <p className="text-xs text-brand-warning-dark font-medium mb-1">💡 Tips:</p>
          <p className="text-xs text-brand-gray-700">Pastikan kamu sudah mengambil foto hasil pekerjaan sebagai bukti. Upload di bagian foto pesanan jika diperlukan.</p>
        </div>

        <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={completeAttestation}
            onChange={e => setCompleteAttestation(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-brand-success shrink-0"
          />
          <span className="text-sm text-brand-gray-700">
            Saya menyatakan pekerjaan sudah <strong>selesai sepenuhnya</strong> sesuai permintaan pelanggan.
          </span>
        </label>
      </MitraModal>
    </div>
  );
}
