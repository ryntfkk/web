"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getErrorMessage } from '@/types/api';
import { PageSkeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/format';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';

export default function AdditionalFeeFormClient() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const platformConfig = usePlatformConfig();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [form, setForm] = useState({
    type: 'extra_service',
    item_name: '',
    unit_price: '',
    quantity: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const unitPrice = parseInt(form.unit_price.replace(/\D/g, ''), 10);
    const qty = Number(form.quantity);

    if (!form.item_name.trim() || !unitPrice || !qty || qty < 1) {
      setError('Semua kolom wajib diisi; kuantitas minimal 1');
      return;
    }
    if (unitPrice < 5000) {
      setError('Harga satuan minimal Rp 5.000');
      return;
    }
    // Batas dari platform_settings — sumber yang sama dengan yang ditegakkan
    // backend di AddAdditionalFees, jadi tidak bisa lagi berbeda diam-diam.
    if (unitPrice * qty > platformConfig.max_additional_fee) {
      setError(`Total tagihan tidak boleh melebihi ${formatPrice(platformConfig.max_additional_fee)}`);
      return;
    }

    setLoading(true);
    setError('');

    // Backend mengharapkan { fees: [{ name, fee_type, price, quantity }] }
    // dengan fee_type enum 'material' | 'service' (bukan 'extra_service').
    const res = await fetchAPI(`/orders/${orderId}/additional-fees`, {
      method: 'POST',
      body: JSON.stringify({
        fees: [
          {
            name: form.item_name,
            fee_type: form.type === 'material' ? 'material' : 'service',
            price: unitPrice,
            quantity: Number(form.quantity),
          },
        ],
      })
    });

    if (res.success) {
      setSuccess(true);
      setTimeout(() => router.replace(`/mitra/orders/${orderId}`), 2000);
    } else {
      setError(getErrorMessage(res));
    }
    
    setLoading(false);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setForm({ ...form, unit_price: '' });
      return;
    }
    setForm({ ...form, unit_price: new Intl.NumberFormat('id-ID').format(parseInt(val, 10)) });
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const unitPriceNum = parseInt(form.unit_price.replace(/\D/g, ''), 10) || 0;
  const totalAmount = unitPriceNum * form.quantity;

  if (success) {
    return (
      <div className="page-h bg-brand-gray-60 flex flex-col justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm border border-brand-gray-100 p-6 max-w-sm w-full mx-auto text-center">
          <div className="w-16 h-16 bg-brand-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-brand-success" />
          </div>
          <h2 className="text-xl font-bold text-brand-gray-900 mb-2">Berhasil Diajukan</h2>
          <p className="text-sm text-brand-gray-700 mb-6">
            Menunggu konfirmasi dan pembayaran dari pelanggan. Pesanan ini sekarang berstatus Menunggu Pembayaran Tambahan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-brand-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button onClick={() => router.push(`/mitra/orders/${orderId}`)} className="p-2 -ml-2 hover:bg-brand-gray-60 rounded-md" aria-label="Kembali">
            <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
          </button>
          <h1 className="text-base font-bold text-brand-gray-900">Ajukan Biaya Tambahan</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-brand-error-soft border border-brand-error-border rounded-lg p-4 flex gap-3 items-start mb-6">
          <AlertCircle className="w-5 h-5 text-brand-error shrink-0 mt-0.5" />
          <p className="text-sm text-brand-error font-medium leading-relaxed">
            Ajukan biaya tambahan jika ada pergantian sparepart, material ekstra, atau layanan di luar kesepakatan awal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-brand-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Tipe Biaya</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`block p-3 rounded-lg border text-center cursor-pointer transition-colors text-sm font-semibold ${form.type === 'extra_service' ? 'border-brand-red bg-brand-error-soft text-brand-red' : 'border-brand-gray-100 bg-white text-brand-gray-700'}`}>
                <input type="radio" name="type" className="hidden" checked={form.type === 'extra_service'} onChange={() => setForm({ ...form, type: 'extra_service' })} />
                Jasa Ekstra
              </label>
              <label className={`block p-3 rounded-lg border text-center cursor-pointer transition-colors text-sm font-semibold ${form.type === 'material' ? 'border-brand-red bg-brand-error-soft text-brand-red' : 'border-brand-gray-100 bg-white text-brand-gray-700'}`}>
                <input type="radio" name="type" className="hidden" checked={form.type === 'material'} onChange={() => setForm({ ...form, type: 'material' })} />
                Material / Sparepart
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Nama Item / Jasa</label>
            <input
              type="text"
              placeholder="Contoh: Kabel 5 meter, Freon..."
              value={form.item_name}
              onChange={e => setForm({ ...form, item_name: e.target.value })}
              className="w-full p-3 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Harga Satuan</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-900 font-bold text-sm">Rp</span>
                <input
                  type="text"
                  value={form.unit_price}
                  onChange={handlePriceChange}
                  placeholder="0"
                  className="w-full p-3 pl-10 border border-brand-gray-100 rounded-md text-sm font-bold text-brand-gray-900 focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Kuantitas</label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.quantity}
                onChange={e => {
                  const q = parseInt(e.target.value, 10);
                  // Clamp minimal 1 (cegah 0/negatif via ketik) & maksimal 100.
                  setForm({ ...form, quantity: Number.isNaN(q) ? 1 : Math.min(100, Math.max(1, q)) });
                }}
                className="w-full p-3 border border-brand-gray-100 rounded-md text-sm font-bold text-brand-gray-900 focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div className="border-t border-brand-gray-100 pt-4 flex justify-between items-center">
            <span className="font-semibold text-brand-gray-900">Total Tagihan:</span>
            <span className="text-xl font-bold text-brand-orange">{formatPrice(totalAmount)}</span>
          </div>

          {error && <div className="bg-brand-error-soft text-brand-error text-sm p-3 rounded-lg border border-brand-error-border">{error}</div>}

          <div className="pt-4">
            <Button
              className="w-full bg-brand-orange hover:bg-brand-orange rounded-md h-12 text-base font-bold text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Mengajukan...' : 'Ajukan Tagihan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
