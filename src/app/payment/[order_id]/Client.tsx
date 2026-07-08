"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Wallet, CreditCard, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


export default function PaymentClient() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.order_id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [snapToken, setSnapToken] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchOrder();
    fetchBalance();
    
    // Load Midtrans script
    const script = document.createElement('script');
    script.src = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL || 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '');
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [isAuthenticated, orderId]);

  const fetchBalance = async () => {
    const res = await fetchAPI<any>('/wallet/balance');
    if (res.success && res.data) {
      setWalletBalance(res.data.balance ?? 0);
    } else {
      setWalletBalance(user?.balance || 0);
    }
  };

  const fetchOrder = async () => {
    setLoading(true);
    const res = await fetchAPI<any>(`/orders/${orderId}`);
    if (res.success && res.data) {
      const data = (res.data as any).data ?? res.data;
      setOrder(data);
      if (data.status !== 'WAITING_PAYMENT' && data.status !== 'WAITING_ADDITIONAL_PAY') {
        router.replace(`/orders/${orderId}`);
      }
    }
    setLoading(false);
  };

  const handlePay = async () => {
    if (!selectedMethod) return;
    
    setProcessing(true);
    if (selectedMethod === 'wallet') {
      // Internal wallet payment
      const res = await fetchAPI(`/payments`, {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, payment_method: 'wallet' })
      });
      if (res.success) {
        router.push(`/payment/${orderId}/status?status=success`);
      } else {
        router.push(`/payment/${orderId}/status?status=failed&message=${encodeURIComponent(res.message || 'Pembayaran gagal')}`);
      }
    } else {
      // Request Midtrans Snap Token
      const res = await fetchAPI<any>(`/payments/snap`, {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, payment_method: selectedMethod })
      });
      
      if (res.success && res.data?.token) {
        setSnapToken(res.data.token);
        // Trigger Snap popup
        if ((window as any).snap) {
          (window as any).snap.pay(res.data.token, {
            onSuccess: () => router.push(`/payment/${orderId}/status?status=success`),
            onPending: () => router.push(`/orders/${orderId}`), // Keep it on order detail to see pending status
            onError: () => router.push(`/payment/${orderId}/status?status=failed`),
            onClose: () => {
              // user closed the popup without finishing
            }
          });
        }
        if (!(window as any).snap) {
          setError('Midtrans SDK failed to load.');
          setProcessing(false);
          return;
        }
      } else {
        setError(res.message || 'Gagal membuat transaksi pembayaran.');
      }
    }
    setProcessing(false);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;
  if (loading) {
    return <div className="min-h-screen bg-[#f7f5f4] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const amountToPay = order?.agreed_price || order?.total_amount || 0;
  const isWalletDisabled = walletBalance < amountToPay;

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </button>
            <h1 className="text-base font-bold text-[#1c1b1b]">Pembayaran Pesanan</h1>
          </div>
          {order?.payment_expired_at && !isNaN(Date.parse(order.payment_expired_at)) && (
            <CountdownTimer 
              targetDate={order.payment_expired_at} 
              format="mm:ss" 
              criticalThresholdSeconds={300} 
              onExpire={() => router.push(`/payment/${orderId}/status?status=timeout`)}
            />
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 text-center space-y-2">
          <p className="text-sm text-[#5b403e]">Total Pembayaran</p>
          <p className="text-3xl font-bold text-[#b51822]">{formatPrice(amountToPay)}</p>
          <p className="text-xs text-[#9e8e8c]">Pesanan #{order?.order_number}</p>
        </div>

        {/* Payment Methods */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#1c1b1b]">Pilih Metode Pembayaran</h2>
          
          {/* Wallet */}
          <label className={`block p-4 rounded-xl border cursor-pointer transition-colors ${selectedMethod === 'wallet' ? 'border-[#b51822] bg-[#FFF5F5]' : 'border-[#e5e2e1] bg-white'} ${isWalletDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className={`w-5 h-5 ${selectedMethod === 'wallet' ? 'text-[#b51822]' : 'text-[#5b403e]'}`} />
                <div>
                  <p className="font-semibold text-[#1c1b1b]">Saldo Dompet</p>
                  <p className="text-xs text-[#9e8e8c]">Saldo: {formatPrice(walletBalance)}</p>
                </div>
              </div>
              <input type="radio" name="payment_method" className="hidden" disabled={isWalletDisabled} checked={selectedMethod === 'wallet'} onChange={() => setSelectedMethod('wallet')} />
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedMethod === 'wallet' ? 'border-[#b51822] bg-[#b51822]' : 'border-[#e5e2e1]'}`}>
                {selectedMethod === 'wallet' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            {isWalletDisabled && <p className="text-xs text-[#E53E3E] mt-2">Saldo tidak mencukupi</p>}
          </label>

          {/* E-Wallet & QRIS */}
          <label className={`block p-4 rounded-xl border cursor-pointer transition-colors ${selectedMethod === 'qris' ? 'border-[#b51822] bg-[#FFF5F5]' : 'border-[#e5e2e1] bg-white'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QrCode className={`w-5 h-5 ${selectedMethod === 'qris' ? 'text-[#b51822]' : 'text-[#5b403e]'}`} />
                <div>
                  <p className="font-semibold text-[#1c1b1b]">QRIS & E-Wallet</p>
                  <p className="text-xs text-[#9e8e8c]">GoPay, OVO, Dana, ShopeePay</p>
                </div>
              </div>
              <input type="radio" name="payment_method" className="hidden" checked={selectedMethod === 'qris'} onChange={() => setSelectedMethod('qris')} />
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedMethod === 'qris' ? 'border-[#b51822] bg-[#b51822]' : 'border-[#e5e2e1]'}`}>
                {selectedMethod === 'qris' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          </label>

          {/* Virtual Account */}
          <label className={`block p-4 rounded-xl border cursor-pointer transition-colors ${selectedMethod === 'bank_transfer' ? 'border-[#b51822] bg-[#FFF5F5]' : 'border-[#e5e2e1] bg-white'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className={`w-5 h-5 ${selectedMethod === 'bank_transfer' ? 'text-[#b51822]' : 'text-[#5b403e]'}`} />
                <div>
                  <p className="font-semibold text-[#1c1b1b]">Virtual Account</p>
                  <p className="text-xs text-[#9e8e8c]">BCA, Mandiri, BNI, BRI</p>
                </div>
              </div>
              <input type="radio" name="payment_method" className="hidden" checked={selectedMethod === 'bank_transfer'} onChange={() => setSelectedMethod('bank_transfer')} />
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedMethod === 'bank_transfer' ? 'border-[#b51822] bg-[#b51822]' : 'border-[#e5e2e1]'}`}>
                {selectedMethod === 'bank_transfer' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-20">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded border-[#5b403e] text-[#5b403e]"
            onClick={fetchOrder} // Check status manual
          >
            Cek Status
          </Button>
          <Button
            className="flex-[2] bg-[#b51822] hover:bg-[#90121a] rounded"
            onClick={handlePay}
            disabled={!selectedMethod || processing}
          >
            {processing ? 'Memproses...' : 'Bayar Sekarang'}
          </Button>
        </div>
      </div>
    </div>
  );
}
