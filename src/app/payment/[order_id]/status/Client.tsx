"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
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

// Status order yang HANYA mungkin tercapai setelah pembayaran masuk. Dipakai
// sebagai sumber kebenaran kedua: bila webhook Midtrans sudah menyentuh order,
// halaman ini tidak boleh mengatakan pembayaran belum terkonfirmasi — kontradiksi
// dengan /orders/{id} adalah yang paling membingungkan pelanggan.
const PAID_ORDER_STATUSES = new Set([
  'PAID',
  'IN_PROGRESS',
  'WAITING_ADDITIONAL_PAY',
  'WAITING_CUSTOMER_CONFIRM',
  'COMPLETED',
  'DISPUTED',
]);

/** 'unpaid' = server memastikan belum lunas. 'error' = kami tidak tahu (gagal teknis). */
type VerifyState = 'checking' | 'ok' | 'unpaid' | 'error';

/** Bentuk minimal yang dibaca halaman ini — bukan DTO order/reconcile lengkap. */
type ReconcileResult = { paid?: boolean };
type OrderPaymentState = { status?: string; paid_at?: string };

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
  const [verify, setVerify] = useState<VerifyState>(needsVerify ? 'checking' : 'ok');
  const [rechecking, setRechecking] = useState(false);

  // Rekonsiliasi aktif: verifikasi ke backend agar order ter-update walau
  // webhook Midtrans gagal terkirim atau telat. Aman dipanggil berulang (idempoten).
  //
  // Dua kegagalan yang WAJIB dibedakan (P0-09): reconcile yang berjalan dan
  // menjawab "belum lunas" adalah keadaan bisnis; reconcile yang gagal teknis
  // (403/5xx/jaringan) berarti kami TIDAK TAHU. Dulu keduanya digabung menjadi
  // satu keadaan "failed", sehingga bug backend menyamar sebagai pembayaran
  // tertunda dan bertahan lama tanpa terdeteksi.
  const runVerify = useCallback(async (): Promise<VerifyState> => {
    const res = await fetchAPI<ReconcileResult>(`/payments/${midtransTxId}/reconcile`, { method: 'POST' });
    if (res.success && (res.data as ReconcileResult)?.paid) return 'ok';

    // Reconcile tidak memastikan lunas → tanya status order. Kalau webhook sudah
    // masuk, order-nya sendiri yang jadi bukti.
    const orderRes = await fetchAPI<OrderPaymentState>(`/orders/${orderId}`);
    if (orderRes.success) {
      const order = (orderRes.data as OrderPaymentState);
      if (order?.paid_at || (order?.status && PAID_ORDER_STATUSES.has(order.status))) return 'ok';
    }

    return res.success ? 'unpaid' : 'error';
  }, [midtransTxId, orderId]);

  useEffect(() => {
    if (!isAuthorized || !needsVerify) return;
    let cancelled = false;
    (async () => {
      const result = await runVerify();
      if (!cancelled) setVerify(result);
    })();
    return () => { cancelled = true; };
  }, [isAuthorized, needsVerify, runVerify]);

  // "Cek Lagi" harus benar-benar mengecek ulang. Reload penuh hanya mengulang
  // request yang sama sambil membuang state — bagi pelanggan tampak tidak terjadi
  // apa-apa.
  const handleRecheck = async () => {
    if (rechecking) return;
    setRechecking(true);
    try {
      setVerify(await runVerify());
    } finally {
      setRechecking(false);
    }
  };

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

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  if (status === 'success' && verify === 'checking') {
    return (
      <div className="page-h bg-brand-gray-60 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-brand-gray-100">
          <Loader2 className="w-16 h-16 text-brand-red mx-auto mb-4 animate-spin" />
          <h1 className="text-xl font-bold text-brand-gray-900 mb-2">Memverifikasi Pembayaran...</h1>
          <p className="text-sm text-brand-gray-700">Mohon tunggu, kami sedang mengonfirmasi pembayaranmu ke penyedia pembayaran.</p>
        </div>
      </div>
    );
  }

  // Server memastikan pembayaran belum masuk → "menunggu konfirmasi", BUKAN
  // sukses. Webhook/reconcile berikutnya yang akan menuntaskan status order.
  if (status === 'success' && verify === 'unpaid') {
    return (
      <div className="page-h bg-brand-gray-60 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-brand-gray-100">
          <Clock className="w-16 h-16 text-brand-orange mx-auto mb-4" />
          <h1 className="text-xl font-bold text-brand-gray-900 mb-2">Menunggu Konfirmasi Pembayaran</h1>
          <p className="text-sm text-brand-gray-700 mb-6">
            Pembayaranmu sedang diproses penyedia pembayaran. Status pesanan akan diperbarui otomatis begitu pembayaran terkonfirmasi.
          </p>
          <div className="space-y-3">
            <Button className="w-full bg-brand-red hover:bg-brand-red-dark rounded" onClick={handleRecheck} isLoading={rechecking}>
              Cek Lagi
            </Button>
            <Button variant="outline" className="w-full rounded border-brand-gray-100" onClick={() => router.replace(`/orders/${orderId}`)}>
              Lihat Detail Pesanan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Kami gagal memverifikasi (403/5xx/jaringan) — bukan berarti uangnya tidak
  // masuk. Katakan apa adanya: jangan menuduh pembayaran tertunda atas dasar
  // kegagalan teknis kami sendiri.
  if (status === 'success' && verify === 'error') {
    return (
      <div className="page-h bg-brand-gray-60 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-brand-gray-100">
          <AlertTriangle className="w-16 h-16 text-brand-warning mx-auto mb-4" />
          <h1 className="text-xl font-bold text-brand-gray-900 mb-2">Gagal Memeriksa Status</h1>
          <p className="text-sm text-brand-gray-700 mb-6">
            Pembayaranmu kemungkinan besar sudah masuk, tetapi kami belum berhasil
            memeriksanya sekarang. Coba lagi, atau buka detail pesanan untuk melihat
            status terkini. Jangan membayar ulang sebelum memeriksanya.
          </p>
          <div className="space-y-3">
            <Button className="w-full bg-brand-red hover:bg-brand-red-dark rounded" onClick={handleRecheck} isLoading={rechecking}>
              Coba Lagi
            </Button>
            <Button variant="outline" className="w-full rounded border-brand-gray-100" onClick={() => router.replace(`/orders/${orderId}`)}>
              Lihat Detail Pesanan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (verifiedSuccess) {
    return (
      <div className="page-h bg-brand-gray-60 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-brand-gray-100">
          <CheckCircle className="w-16 h-16 text-brand-success mx-auto mb-4" />
          <h1 className="text-xl font-bold text-brand-gray-900 mb-2">Pembayaran Berhasil!</h1>
          <p className="text-sm text-brand-gray-700 mb-6">
            Pesanan Anda telah dibayar dan akan segera diproses oleh mitra.
          </p>
          <div className="space-y-3">
            <Button className="w-full bg-brand-red hover:bg-brand-red-dark rounded" onClick={() => router.replace(`/orders/${orderId}`)}>
              Lihat Detail Pesanan
            </Button>
            <Button variant="outline" className="w-full rounded border-brand-gray-100" onClick={() => router.push('/')}>
              Kembali ke Beranda
            </Button>
          </div>
          <p className="text-xs text-brand-gray-450 mt-4">
            Mengarahkan otomatis dalam {countdown} detik...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="page-h bg-brand-gray-60 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-brand-gray-100">
          <Clock className="w-16 h-16 text-brand-orange mx-auto mb-4" />
          <h1 className="text-xl font-bold text-brand-gray-900 mb-2">Menunggu Pembayaran</h1>
          <p className="text-sm text-brand-gray-700 mb-6">
            Selesaikan pembayaran Anda sesuai instruksi (mis. transfer ke Virtual Account). Pesanan akan otomatis diproses setelah pembayaran kami terima.
          </p>
          {orderId && (
            <p className="text-xs text-brand-gray-450 mb-6">
              No. Pesanan: <span className="font-semibold text-brand-gray-700">{orderId}</span>
            </p>
          )}
          <div className="space-y-3">
            <Button className="w-full bg-brand-red hover:bg-brand-red-dark rounded" onClick={() => router.replace(`/payment/${orderId}`)}>
              Bayar Sekarang
            </Button>
            <Button variant="outline" className="w-full rounded border-brand-gray-100" onClick={() => router.replace(`/orders/${orderId}`)}>
              Lihat Detail Pesanan
            </Button>
            <Button variant="outline" className="w-full rounded border-brand-gray-100" onClick={() => router.push('/')}>
              Kembali ke Beranda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="page-h bg-brand-gray-60 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-brand-gray-100">
          <Clock className="w-16 h-16 text-brand-gray-450 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-brand-gray-900 mb-2">Batas Waktu Habis</h1>
          <p className="text-sm text-brand-gray-700 mb-6">
            Batas waktu pembayaran telah habis. Pesanan ini akan dibatalkan otomatis oleh sistem.
          </p>
          {orderId && (
            <p className="text-xs text-brand-gray-450 mb-6">
              No. Pesanan: <span className="font-semibold text-brand-gray-700">{orderId}</span>
            </p>
          )}
          <div className="space-y-3">
            <Button className="w-full bg-brand-red hover:bg-brand-red-dark rounded" onClick={() => router.push('/')}>
              Cari Jasa Lain
            </Button>
            <Button variant="outline" className="w-full rounded border-brand-gray-100" onClick={() => router.replace(`/orders/${orderId}`)}>
              Lihat Detail Pesanan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Failed
  return (
    <div className="page-h bg-brand-gray-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center border border-brand-gray-100">
        <XCircle className="w-16 h-16 text-brand-error mx-auto mb-4" />
        <h1 className="text-xl font-bold text-brand-gray-900 mb-2">Pembayaran Gagal</h1>
        <p className="text-sm text-brand-gray-700 mb-6">
          {message || 'Maaf, terjadi kesalahan saat memproses pembayaran Anda. Silakan coba lagi.'}
        </p>
        {orderId && (
          <p className="text-xs text-brand-gray-450 mb-6">
            No. Pesanan: <span className="font-semibold text-brand-gray-700">{orderId}</span>
          </p>
        )}
        <div className="space-y-3">
          <Button className="w-full bg-brand-red hover:bg-brand-red-dark rounded" onClick={() => router.replace(`/payment/${orderId}`)}>
            Coba Bayar Lagi
          </Button>
          <Button variant="outline" className="w-full rounded border-brand-gray-100" onClick={() => router.replace(`/orders/${orderId}`)}>
            Lihat Detail Pesanan
          </Button>
          <Button variant="outline" className="w-full rounded border-brand-gray-100" onClick={() => router.push('/')}>
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    </div>
  );
}
