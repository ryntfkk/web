"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';

// Petakan status dari Midtrans finish-redirect (transaction_status) ke status UI.
// `status` (parameter internal kita) diprioritaskan bila ada.
function mapStatus(
  raw: string | null,
  tx: string | null,
): 'success' | 'pending' | 'failed' | 'timeout' {
  if (raw === 'success' || raw === 'pending' || raw === 'failed' || raw === 'timeout') {
    return raw;
  }
  switch (tx) {
    case 'settlement':
    case 'capture':
      return 'success';
    case 'pending':
      return 'pending';
    case 'deny':
    case 'cancel':
    case 'failure':
      return 'failed';
    case 'expire':
      return 'timeout';
    default:
      return raw ? 'failed' : 'pending';
  }
}

export default function PaymentStatusClient() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params?.order_id as string;
  const status = mapStatus(searchParams.get('status'), searchParams.get('transaction_status'));
  const message = searchParams.get('message');
  // Midtrans mengirim transaction_id kita pada parameter `order_id` saat finish-redirect.
  const midtransTxId = searchParams.get('order_id');

  const [countdown, setCountdown] = useState(5);

  // Rekonsiliasi aktif: verifikasi ke backend agar order ter-update walau
  // webhook Midtrans gagal terkirim atau telat. Aman dipanggil berulang (idempoten).
  useEffect(() => {
    if (!isAuthorized || status !== 'success' || !midtransTxId) return;
    fetchAPI(`/payments/${midtransTxId}/reconcile`, { method: 'POST' }).catch(() => {});
  }, [isAuthorized, status, midtransTxId]);

  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push(`/orders/${orderId}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, orderId, router]);

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  if (status === 'success') {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-[#e5e2e1]">
          <CheckCircle className="w-16 h-16 text-[#38A169] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1c1b1b] mb-2">Pembayaran Berhasil!</h1>
          <p className="text-sm text-[#5b403e] mb-6">
            Pesanan Anda telah dibayar dan akan segera diproses oleh mitra.
          </p>
          <div className="space-y-3">
            <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => router.push(`/orders/${orderId}`)}>
              Lihat Detail Pesanan
            </Button>
            <Button variant="outline" className="w-full rounded border-[#e5e2e1]" onClick={() => router.push('/')}>
              Kembali ke Beranda
            </Button>
          </div>
          <p className="text-xs text-[#9e8e8c] mt-4">
            Mengarahkan otomatis dalam {countdown} detik...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-[#e5e2e1]">
          <Clock className="w-16 h-16 text-[#DD6B20] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1c1b1b] mb-2">Menunggu Pembayaran</h1>
          <p className="text-sm text-[#5b403e] mb-6">
            Selesaikan pembayaran Anda sesuai instruksi (mis. transfer ke Virtual Account). Pesanan akan otomatis diproses setelah pembayaran kami terima.
          </p>
          <div className="space-y-3">
            <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => router.push(`/orders/${orderId}`)}>
              Lihat Detail Pesanan
            </Button>
            <Button variant="outline" className="w-full rounded border-[#e5e2e1]" onClick={() => router.push('/')}>
              Kembali ke Beranda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-[#e5e2e1]">
          <Clock className="w-16 h-16 text-[#9e8e8c] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1c1b1b] mb-2">Batas Waktu Habis</h1>
          <p className="text-sm text-[#5b403e] mb-6">
            Batas waktu pembayaran telah habis. Pesanan ini telah dibatalkan secara otomatis.
          </p>
          <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => router.push('/')}>
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  // Failed
  return (
    <div className="page-h bg-[#f7f5f4] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-[#e5e2e1]">
        <XCircle className="w-16 h-16 text-[#E53E3E] mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#1c1b1b] mb-2">Pembayaran Gagal</h1>
        <p className="text-sm text-[#5b403e] mb-6">
          {message || 'Maaf, terjadi kesalahan saat memproses pembayaran Anda. Silakan coba lagi.'}
        </p>
        <div className="space-y-3">
          <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => router.push(`/payment/${orderId}`)}>
            Coba Lagi
          </Button>
          <Button variant="outline" className="w-full rounded border-[#e5e2e1]" onClick={() => router.push('/')}>
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    </div>
  );
}
