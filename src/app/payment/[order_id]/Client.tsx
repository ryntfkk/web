"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Wallet, CreditCard, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { fetchAPI } from '@/lib/api';
import { payOrderWithWallet, payOrderWithSnap } from '@/lib/payment';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { formatRupiah } from '@/lib/format';
import { StickyActionBar } from '@/components/ui/sticky-action-bar';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';


export default function PaymentClient() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.order_id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const fetchBalance = useCallback(async () => {
    const res = await fetchAPI<any>('/wallet/balance');
    if (res.success && res.data) {
      const data = res.data;
      setWalletBalance(data?.balance ?? 0);
    } else {
      setWalletBalance(user?.balance || 0);
    }
  }, [user?.balance]);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const res = await fetchAPI<any>(`/orders/${orderId}`);
    if (res.success && res.data) {
      const data = res.data;
      setOrder(data);
      if (data.status === 'WAITING_ADDITIONAL_PAY') {
        router.replace(`/orders/${orderId}/additional-fee`);
      } else if (data.status !== 'WAITING_PAYMENT') {
        router.replace(`/orders/${orderId}`);
      }
    }
    setLoading(false);
  }, [orderId, router]);

  useEffect(() => {
    if (isAuthorized) {
      fetchOrder();
      fetchBalance();
    }
  }, [isAuthorized, fetchOrder, fetchBalance]);

  const handlePay = async () => {
    if (!selectedMethod || processing) return;

    setError('');
    setProcessing(true);

    if (selectedMethod === 'wallet') {
      // Guard tambahan: jangan kirim request jika saldo tidak cukup
      if (isWalletDisabled) {
        setError('Saldo dompet tidak mencukupi.');
        setProcessing(false);
        return;
      }
      const result = await payOrderWithWallet(orderId);
      // replace: halaman pilih-metode ini transien . setelah hasil keluar,
      // back tidak boleh kembali ke form pembayaran yang sudah tidak berlaku.
      if (result.status === 'wallet_success') {
        router.replace(`/payment/${orderId}/status?status=success`);
      } else {
        router.replace(`/payment/${orderId}/status?status=failed&message=${encodeURIComponent(result.message)}`);
      }
      setProcessing(false);
      return;
    }

    // Online → Snap: redirect penuh ke halaman Midtrans (pola seragam,
    // menghindari isu CSP pada popup embedded). Helper melakukan navigasi.
    const result = await payOrderWithSnap(orderId, selectedMethod);
    if (result.status === 'error') {
      setError(result.message);
      setProcessing(false);
    }
    // status 'redirecting' → browser berpindah halaman; biarkan processing.
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;
  if (loading) {
    return (
      <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-40" />
          <div className="rounded-lg border border-brand-gray-100 bg-white p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const amountToPay = order?.agreed_price || order?.total_amount || 0;
  const isWalletDisabled = walletBalance < amountToPay;

  return (
    <>
      <div className="page-h bg-brand-gray-60 pb-24">
        {/* Header */}
        {/* Header khusus mobile . di desktop TopNavbar sudah jadi satu-satunya header. */}
        <div className="bg-white border-b border-brand-gray-100 px-4 py-4 sticky top-0 z-10 lg:hidden">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push(`/orders/${orderId}`)} className="p-2 -ml-2 hover:bg-brand-gray-60 rounded">
                <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
              </button>
              <h1 className="text-base font-bold text-brand-gray-900">Pembayaran Pesanan</h1>
            </div>
            {order?.payment_expired_at && !isNaN(Date.parse(order.payment_expired_at)) && (
              <CountdownTimer
                targetDate={order.payment_expired_at}
                format="mm:ss"
                criticalThresholdSeconds={300}
                onExpire={() => router.replace(`/payment/${orderId}/status?status=timeout`)}
              />
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Judul desktop . countdown ikut dipindah agar tidak hilang saat header mobile disembunyikan. */}
          <div className="hidden lg:flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-brand-gray-900">Pembayaran Pesanan</h1>
            {order?.payment_expired_at && !isNaN(Date.parse(order.payment_expired_at)) && (
              <CountdownTimer
                targetDate={order.payment_expired_at}
                format="mm:ss"
                criticalThresholdSeconds={300}
                onExpire={() => router.replace(`/payment/${orderId}/status?status=timeout`)}
              />
            )}
          </div>

          {/* Ringkasan + RINCIAN.
              Sebelumnya halaman ini hanya menampilkan satu angka total. Di titik
              pengambilan keputusan membayar, pelanggan tidak bisa melihat layanan
              apa yang dibayar, berapa ongkos transport, atau potongan promonya .
              padahal semua field itu SUDAH ADA di respons `/orders/{id}` yang
              halaman ini fetch, dan sudah dirender halaman detail (audit E3). */}
          <div className="bg-white rounded-lg border border-brand-gray-100 p-4 space-y-3">
            <div className="text-center space-y-1">
              <p className="text-sm text-brand-gray-700">Total Pembayaran</p>
              <p className="text-3xl font-bold text-brand-red">{formatRupiah(amountToPay)}</p>
              <p className="text-xs text-brand-gray-450">Pesanan #{order?.order_number}</p>
            </div>

            {order?.items?.length > 0 && (
              <ul className="border-t border-brand-gray-100 pt-3 space-y-1.5">
                {order.items.map((item: { id: string; service_name: string; quantity: number; price: number }) => (
                  <li key={item.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-brand-gray-700 min-w-0">
                      <span className="block truncate">{item.service_name}</span>
                      {item.quantity > 1 && (
                        <span className="text-xs text-brand-gray-450">
                          {item.quantity} × {formatRupiah(item.price)}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-brand-gray-900">
                      {formatRupiah(item.price * (item.quantity || 1))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <dl className="border-t border-brand-gray-100 pt-3 space-y-1.5 text-sm">
              {typeof order?.total_service_price === 'number' && order.total_service_price > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-gray-700">Subtotal layanan</dt>
                  <dd className="text-brand-gray-900">{formatRupiah(order.total_service_price)}</dd>
                </div>
              )}
              {order?.transport_fee > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-gray-700">Biaya transport</dt>
                  <dd className="text-brand-gray-900">{formatRupiah(order.transport_fee)}</dd>
                </div>
              )}
              {order?.admin_fee > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-gray-700">Biaya admin</dt>
                  <dd className="text-brand-gray-900">{formatRupiah(order.admin_fee)}</dd>
                </div>
              )}
              {order?.promo_discount > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-gray-700">Potongan promo</dt>
                  <dd className="font-medium text-brand-success">-{formatRupiah(order.promo_discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-brand-gray-100 pt-1.5 font-bold">
                <dt className="text-brand-gray-900">Total</dt>
                <dd className="text-brand-red">{formatRupiah(amountToPay)}</dd>
              </div>
            </dl>
          </div>

          {/* Payment Methods */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-brand-gray-900">Pilih Metode Pembayaran</h2>

            {/* Wallet */}
            <label className={`block p-4 rounded-lg border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-blue ${selectedMethod === 'wallet' ? 'border-brand-red bg-brand-red-light' : 'border-brand-gray-100 bg-white'} ${isWalletDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className={`w-5 h-5 ${selectedMethod === 'wallet' ? 'text-brand-red' : 'text-brand-gray-700'}`} />
                  <div>
                    <p className="font-semibold text-brand-gray-900">Saldo Dompet</p>
                    <p className="text-xs text-brand-gray-450">Saldo: {formatRupiah(walletBalance)}</p>
                  </div>
                </div>
                <input type="radio" name="payment_method" className="sr-only" disabled={isWalletDisabled} checked={selectedMethod === 'wallet'} onChange={() => setSelectedMethod('wallet')} />
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedMethod === 'wallet' ? 'border-brand-red bg-brand-red' : 'border-brand-gray-100'}`}>
                  {selectedMethod === 'wallet' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
              {isWalletDisabled && <p className="text-xs text-brand-error mt-2">Saldo tidak mencukupi</p>}
            </label>

            {/* E-Wallet & QRIS */}
            <label className={`block p-4 rounded-lg border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-blue ${selectedMethod === 'qris' ? 'border-brand-red bg-brand-red-light' : 'border-brand-gray-100 bg-white'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <QrCode className={`w-5 h-5 ${selectedMethod === 'qris' ? 'text-brand-red' : 'text-brand-gray-700'}`} />
                  <div>
                    <p className="font-semibold text-brand-gray-900">QRIS & E-Wallet</p>
                    <p className="text-xs text-brand-gray-450">GoPay, OVO, Dana, ShopeePay</p>
                  </div>
                </div>
                <input type="radio" name="payment_method" className="sr-only" checked={selectedMethod === 'qris'} onChange={() => setSelectedMethod('qris')} />
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedMethod === 'qris' ? 'border-brand-red bg-brand-red' : 'border-brand-gray-100'}`}>
                  {selectedMethod === 'qris' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </label>

            {/* Virtual Account */}
            <label className={`block p-4 rounded-lg border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-blue ${selectedMethod === 'bank_transfer' ? 'border-brand-red bg-brand-red-light' : 'border-brand-gray-100 bg-white'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className={`w-5 h-5 ${selectedMethod === 'bank_transfer' ? 'text-brand-red' : 'text-brand-gray-700'}`} />
                  <div>
                    <p className="font-semibold text-brand-gray-900">Virtual Account</p>
                    <p className="text-xs text-brand-gray-450">BCA, Mandiri, BNI, BRI</p>
                  </div>
                </div>
                <input type="radio" name="payment_method" className="sr-only" checked={selectedMethod === 'bank_transfer'} onChange={() => setSelectedMethod('bank_transfer')} />
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedMethod === 'bank_transfer' ? 'border-brand-red bg-brand-red' : 'border-brand-gray-100'}`}>
                  {selectedMethod === 'bank_transfer' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Action Bar */}
        <StickyActionBar desktop className="px-0 pt-0">
          <div className="w-full max-w-2xl mx-auto px-4 pt-3">
            {error && (
              <div className="mb-2 p-2.5 bg-brand-error-soft border border-brand-error/40 rounded-md text-xs text-brand-error">
                {error}
              </div>
            )}
            <div className="flex items-center gap-3 pb-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={fetchOrder} // Check status manual
              >
                Cek Status
              </Button>
              <Button
                className="flex-[2]"
                onClick={handlePay}
                disabled={!selectedMethod || processing}
              >
                {processing ? 'Memproses...' : 'Bayar Sekarang'}
              </Button>
            </div>
          </div>
        </StickyActionBar>
      </div>
    </>
  );
}
