"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, X, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { fetchAPI } from '@/lib/api';
import { normalizeOrder, unwrapData } from '@/lib/order-utils';
import { getErrorMessage } from '@/types/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


interface AdditionalFee {
  id: string;
  type: 'extra_service' | 'material';
  item_name: string;
  unit_price: number;
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

function formatPrice(p: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!isAuthorized || !orderId) return;
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    const res = await fetchAPI<any>(`/orders/${orderId}`);
    if (res.success && res.data) {
      setOrder(normalizeOrder(unwrapData<any>(res.data)));
    }
    setLoading(false);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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
      showToast('Tagihan berhasil disetujui dan dibayar.');
      setTimeout(() => router.push(`/orders/${orderId}`), 1500);
    } else {
      showToast(getErrorMessage(res), 'error');
    }
    setActionLoading(false);
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
      setTimeout(() => router.push(`/orders/${orderId}`), 1500);
    } else {
      showToast(getErrorMessage(res), 'error');
    }
    setActionLoading(false);
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  if (loading) {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fee = order?.additional_fees?.find(f => f.status === 'PENDING');
  if (!fee || fee.status !== 'PENDING') {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[#5b403e] mb-4">Tidak ada tagihan tambahan yang menunggu persetujuan.</p>
          <Button onClick={() => router.push(`/orders/${orderId}`)}>Kembali</Button>
        </div>
      </div>
    );
  }

  const baseAmount = Math.max(0, (order?.total_amount ?? 0) - fee.total);

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-[#38A169]' : 'bg-[#E53E3E]'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 sticky top-0 lg:top-16 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </button>
            <h1 className="text-base font-bold text-[#1c1b1b]">Tagihan Tambahan</h1>
          </div>
          {fee.expired_at && (
            <CountdownTimer targetDate={fee.expired_at} format="mm:ss" criticalThresholdSeconds={300} />
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-[#5b403e]">
          <span className="font-semibold text-[#1c1b1b]">{order?.partner_name ?? 'Mitra'}</span> mengajukan biaya tambahan:
        </p>

        {/* Fee Detail Card */}
        <div className="bg-[#f4f0ef] rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-[#9e8e8c]">Tipe</span>
            <span className="font-medium text-[#1c1b1b]">
              {fee.type === 'extra_service' ? 'Jasa Ekstra' : 'Material'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#9e8e8c]">Item</span>
            <span className="font-medium text-[#1c1b1b]">{fee.item_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#9e8e8c]">Harga Satuan</span>
            <span className="font-medium text-[#1c1b1b]">{formatPrice(fee.unit_price)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#9e8e8c]">Qty</span>
            <span className="font-medium text-[#1c1b1b]">{fee.quantity}</span>
          </div>
          <div className="border-t border-[#e5e2e1] pt-2.5 flex justify-between text-sm font-semibold">
            <span className="text-[#1c1b1b]">Total Tambahan</span>
            <span className="text-[#DD6B20]">{formatPrice(fee.total)}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded border border-[#e5e2e1] p-4 space-y-2 text-sm">
          <div className="flex justify-between text-[#5b403e]">
            <span>Pesanan asal</span>
            <span>{formatPrice(baseAmount)}</span>
          </div>
          <div className="flex justify-between text-[#DD6B20]">
            <span>Biaya tambahan</span>
            <span>+ {formatPrice(fee.total)}</span>
          </div>
          <div className="border-t border-[#e5e2e1] pt-2 flex justify-between font-bold text-base">
            <span className="text-[#1c1b1b]">Total yang harus dibayar</span>
            <span className="text-[#b51822]">{formatPrice(order?.total_amount ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-20">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded border-[#5b403e] text-[#5b403e]"
            onClick={() => setShowRejectDialog(true)}
            disabled={actionLoading}
          >
            Tolak
          </Button>
          <Button
            className="flex-1 bg-[#b51822] hover:bg-[#90121a] rounded"
            onClick={handleApprove}
            disabled={actionLoading}
          >
            {actionLoading ? 'Memproses...' : `Setujui (Potong Saldo ${formatPrice(fee.total)})`}
          </Button>
        </div>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1c1b1b]">Tolak Biaya Tambahan?</h3>
              <button onClick={() => setShowRejectDialog(false)}>
                <X className="w-5 h-5 text-[#9e8e8c]" />
              </button>
            </div>
            <p className="text-sm text-[#5b403e] mb-6">
              Mitra dapat memilih untuk tetap melanjutkan pekerjaan atau mengajukan laporan masalah.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded border-[#e5e2e1]" onClick={() => setShowRejectDialog(false)}>
                Batal
              </Button>
              <Button className="flex-1 bg-[#E53E3E] hover:bg-[#C53030] rounded" onClick={handleReject}>
                Ya, Tolak
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
