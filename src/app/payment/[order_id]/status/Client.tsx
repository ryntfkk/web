"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { unwrapData } from '@/lib/order-utils';
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
  // Verifikasi server sebelum mengklaim sukses. Query param dari redirect
  // Midtrans bisa dimanipulasi/basi — sumber kebenaran adalah reconcile.
  // Untuk pembayaran wallet (tanpa midtransTxId) hasilnya sudah sinkron
  // dari respons API, jadi langsung 'ok'.
  const needsVerify = status === 'success' && !!midtransTxId;
  const [verify, setVerify] = useState<'checking' | 'ok' | 'failed'>(needsVerify ? 'checking' : 'ok');

  // Rekonsiliasi aktif: verifikasi ke backend agar order ter-update walau
  // webhook Midtrans gagal terkirim atau telat. Aman dipanggil berulang (idempoten).
  useEffect(() => {
    if (!isAuthorized || !needsVerify) return;
    let cancelled = false;
    (async () => {
      const res = await fetchAPI<any>(`/payments/${midtransTxId}/reconcile`, { method: 'POST' });
      if (cancelled) return;
      const data = res.success ? unwrapData<any>(res.data) : null;
      setVerify(res.success && data?.paid ? 'ok' : 'failed');
    })();
    return () => { cancelled = true; };
  }, [isAuthorized, needsVerify, midtransTxId]);

  const verifiedSuccess = status === 'success' && verify === 'ok';

  useEffect(() => {
    if (verifiedSuccess) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // replace: halaman status transien — back dari detail pesanan
            // tidak boleh kembali ke kartu "Pembayaran Berhasil" yang basi.
            router.replace(`/orders/${orderId}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [verifiedSuccess, orderId, router]);

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  if (status === 'success' && verify === 'checking') {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-[#e5e2e1]">
          <Loader2 className="w-16 h-16 text-[#b51822] mx-auto mb-4 animate-spin" />
          <h1 className="text-xl font-bold text-[#1c1b1b] mb-2">Memverifikasi Pembayaran...</h1>
          <p className="text-sm text-[#5b403e]">Mohon tunggu, kami sedang mengonfirmasi pembayaranmu ke penyedia pembayaran.</p>
        </div>
      </div>
    );
  }

  // Redirect bilang sukses tapi server belum bisa mengonfirmasi → tampilkan
  // sebagai "menunggu konfirmasi", BUKAN sukses. Webhook/reconcile berikutnya
  // yang akan menuntaskan status order.
  if (status === 'success' && verify === 'failed') {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-[#e5e2e1]">
          <Clock className="w-16 h-16 text-[#DD6B20] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1c1b1b] mb-2">Menunggu Konfirmasi Pembayaran</h1>
          <p className="text-sm text-[#5b403e] mb-6">
            Pembayaranmu sedang diproses penyedia pembayaran. Status pesanan akan diperbarui otomatis begitu pembayaran terkonfirmasi.
          </p>
          <div className="space-y-3">
            <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => window.location.reload()}>
              Cek Lagi
            </Button>
            <Button variant="outline" className="w-full rounded border-[#e5e2e1]" onClick={() => router.replace(`/orders/${orderId}`)}>
              Lihat Detail Pesanan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (verifiedSuccess) {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-[#e5e2e1]">
          <CheckCircle className="w-16 h-16 text-[#38A169] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1c1b1b] mb-2">Pembayaran Berhasil!</h1>
          <p className="text-sm text-[#5b403e] mb-6">
            Pesanan Anda telah dibayar dan akan segera diproses oleh mitra.
          </p>
          <div className="space-y-3">
            <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => router.replace(`/orders/${orderId}`)}>
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
            <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => router.replace(`/orders/${orderId}`)}>
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
            Batas waktu pembayaran telah habis. Pesanan ini akan dibatalkan otomatis oleh sistem.
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
          <Button className="w-full bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => router.replace(`/payment/${orderId}`)}>
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
