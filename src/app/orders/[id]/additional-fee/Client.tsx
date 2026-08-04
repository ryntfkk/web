"use client";
import { useToast } from '@/components/ui/toast';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, X, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { fetchAPI } from '@/lib/api';
import { formatRupiah as formatPrice } from '@/lib/format';
import { isInsufficientBalance, payAdditionalFeeWithSnap } from '@/lib/payment';
import { getErrorMessage } from '@/types/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';


// Bentuk field mengikuti AdditionalFeeDTO backend: type = 'service' | 'material',
// harga satuan di field `price` (bukan unit_price).
interface AdditionalFee {
  id: string;
  type: 'service' | 'material';
  item_name: string;
  price: number;
  quantity: number;
  total: number;
  expired_at?: string;
  status: string;
}

interface OrderInfo {
  id: string;
  order_number: string;
  total_amount: number;
  partner_name?: string;
  additional_fees?: AdditionalFee[];
}

export default function AdditionalFeeClient() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthorized || !orderId) return;
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    const res = await fetchAPI<any>(`/orders/${orderId}`);
    if (res.success && res.data) {
      setOrder(res.data);
    }
    setLoading(false);
  };


  const handleApprove = async () => {
    const fee = order?.additional_fees?.find(f => f.status === 'PENDING');
    if (!fee) return;
    setActionLoading(true);
    const res = await fetchAPI(`/orders/${orderId}/additional-fees/${fee.id}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ accept: true }),
    });
    if (res.success) {
      showToast('Tagihan berhasil disetujui dan dibayar dari saldo dompet.');
      const updatedOrder = await fetchOrderData();
      if (!updatedOrder?.additional_fees?.some((f: any) => f.status === 'PENDING')) {
        setTimeout(() => router.replace(`/orders/${orderId}`), 1000);
      }
    } else if (isInsufficientBalance(res)) {
      showToast('Saldo dompet tidak mencukupi. Gunakan tombol "Bayar via Midtrans" di bawah.', 'error');
    } else {
      showToast(getErrorMessage(res), 'error');
    }
    setActionLoading(false);
  };

  // Jalur Midtrans: untuk pelanggan yang saldo dompetnya tidak cukup.
  // Backend menagih fee PENDING tertua; sukses → redirect ke halaman Snap.
  const handlePayWithSnap = async () => {
    setActionLoading(true);
    const result = await payAdditionalFeeWithSnap(orderId);
    if (result.status === 'error') {
      showToast(result.message, 'error');
      setActionLoading(false);
    }
    // status 'redirecting' → browser berpindah halaman; biarkan loading.
  };

  const handleReject = async () => {
    const fee = order?.additional_fees?.find(f => f.status === 'PENDING');
    if (!fee) return;
    setShowRejectDialog(false);
    setActionLoading(true);
    const res = await fetchAPI(`/orders/${orderId}/additional-fees/${fee.id}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ accept: false }),
    });
    if (res.success) {
      showToast('Tagihan ditolak.');
      const updatedOrder = await fetchOrderData();
      if (!updatedOrder?.additional_fees?.some((f: any) => f.status === 'PENDING')) {
        setTimeout(() => router.replace(`/orders/${orderId}`), 1000);
      }
    } else {
      showToast(getErrorMessage(res), 'error');
    }
    setActionLoading(false);
  };

  const fetchOrderData = async () => {
    const res = await fetchAPI<any>(`/orders/${orderId}`);
    if (res.success && res.data) {
      const data = res.data;
      setOrder(data);
      return data;
    }
    return null;
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  if (loading) {
    return (
      <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-40" />
          <div className="rounded-lg border border-brand-gray-100 bg-white p-6 space-y-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const pendingFees = order?.additional_fees?.filter(f => f.status === 'PENDING') || [];
  const fee = pendingFees[0];
  if (!fee) {
    return (
      <div className="page-h bg-brand-gray-60 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-brand-gray-700 mb-4">Tidak ada tagihan tambahan yang menunggu persetujuan.</p>
          <Button onClick={() => router.push(`/orders/${orderId}`)}>Kembali</Button>
        </div>
      </div>
    );
  }

  // total_amount = harga pesanan asal yang SUDAH dibayar saat status PAID
  // (backend TIDAK menambahkan fee PENDING ke total_amount). Yang ditagih
  // sekarang hanyalah biaya tambahan (fee.total), dibayar via saldo/Midtrans.
  const originalPaid = order?.total_amount ?? 0;
  const amountDue = fee.total;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">

      {/* Header */}
      {/* Header khusus mobile — di desktop TopNavbar sudah jadi satu-satunya header. */}
      <div className="bg-white border-b border-brand-gray-100 px-4 py-4 sticky top-0 z-10 lg:hidden">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/orders/${orderId}`)} className="p-2 -ml-2 hover:bg-brand-gray-60 rounded">
              <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
            </button>
            <h1 className="text-base font-bold text-brand-gray-900">
              Tagihan Tambahan {pendingFees.length > 1 ? `(1/${pendingFees.length})` : ''}
            </h1>
          </div>
          {fee.expired_at && (
            <CountdownTimer targetDate={fee.expired_at} format="hh:mm:ss" criticalThresholdSeconds={3600} warningThresholdSeconds={10800} />
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Judul desktop — countdown ikut dipindah agar tidak hilang saat header mobile disembunyikan. */}
        <div className="hidden lg:flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-brand-gray-900">
            Tagihan Tambahan {pendingFees.length > 1 ? `(1 dari ${pendingFees.length})` : ''}
          </h1>
          {fee.expired_at && (
            <CountdownTimer targetDate={fee.expired_at} format="hh:mm:ss" criticalThresholdSeconds={3600} warningThresholdSeconds={10800} />
          )}
        </div>
        <p className="text-sm text-brand-gray-700">
          <span className="font-semibold text-brand-gray-900">{order?.partner_name ?? 'Mitra'}</span> mengajukan biaya tambahan:
        </p>
        {fee.expired_at && (
          <p className="text-xs text-brand-gray-450">
            Tagihan yang tidak direspon dalam 24 jam akan otomatis ditolak dan pengerjaan dilanjutkan tanpa biaya tambahan ini.
          </p>
        )}

        {/* Fee Detail Card */}
        <div className="bg-brand-surface-warm rounded-lg p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray-450">Tipe</span>
            <span className="font-medium text-brand-gray-900">
              {fee.type === 'material' ? 'Material' : 'Jasa Ekstra'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray-450">Item</span>
            <span className="font-medium text-brand-gray-900">{fee.item_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray-450">Harga Satuan</span>
            <span className="font-medium text-brand-gray-900">{formatPrice(fee.price)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray-450">Qty</span>
            <span className="font-medium text-brand-gray-900">{fee.quantity}</span>
          </div>
          <div className="border-t border-brand-gray-100 pt-2.5 flex justify-between text-sm font-semibold">
            <span className="text-brand-gray-900">Total Tambahan</span>
            <span className="text-brand-orange">{formatPrice(fee.total)}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg border border-brand-gray-100 p-4 space-y-2 text-sm">
          <div className="flex justify-between text-brand-gray-700">
            <span>Pesanan asal (sudah dibayar)</span>
            <span>{formatPrice(originalPaid)}</span>
          </div>
          <div className="flex justify-between text-brand-orange">
            <span>Biaya tambahan</span>
            <span>+ {formatPrice(amountDue)}</span>
          </div>
          <div className="border-t border-brand-gray-100 pt-2 flex justify-between font-bold text-base">
            <span className="text-brand-gray-900">Yang harus dibayar sekarang</span>
            <span className="text-brand-red">{formatPrice(amountDue)}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-gray-100 px-4 pt-3 pb-safe z-20 shadow-top">
        <div className="max-w-lg mx-auto space-y-2">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRejectDialog(true)}
              disabled={actionLoading}
            >
              Tolak
            </Button>
            <Button
              className="flex-1"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? 'Memproses...' : `Setujui (Potong Saldo ${formatPrice(fee.total)})`}
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full border-brand-orange text-brand-orange hover:bg-brand-orange-light"
            onClick={handlePayWithSnap}
            disabled={actionLoading}
          >
            Bayar via Midtrans (QRIS / VA / E-Wallet)
          </Button>
        </div>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-brand-gray-900">Tolak Biaya Tambahan?</h3>
              <button onClick={() => setShowRejectDialog(false)}>
                <X className="w-5 h-5 text-brand-gray-450" />
              </button>
            </div>
            <p className="text-sm text-brand-gray-700 mb-6">
              Mitra dapat memilih untuk tetap melanjutkan pekerjaan atau mengajukan laporan masalah.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowRejectDialog(false)}>
                Batal
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleReject}>
                Ya, Tolak
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
