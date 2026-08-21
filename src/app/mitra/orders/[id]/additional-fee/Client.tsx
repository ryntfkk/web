"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useOrderDetail } from '@/hooks/useOrders';
import { pesanGalatPesanan } from '@/lib/order-error';
import { PageSkeleton } from '@/components/ui/skeleton';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import MitraInfoBanner from '@/components/mitra/MitraInfoBanner';

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

  // Tagihan yang SUDAH menempel di pesanan ini. Plafonnya berlaku untuk
  // PESANAN, bukan per baris (backend: validateAdditionalFeeCap menjumlahkan
  // semua fee kecuali yang ditolak pelanggan), jadi memeriksa baris ini saja
  // membuat pengajuan kedua lolos di layar lalu ditolak server.
  const { data: order } = useOrderDetail<{
    additional_fees?: { total: number; status: 'PENDING' | 'PAID' | 'REJECTED' }[];
  }>(orderId);
  const feeSudahAda = (order?.additional_fees ?? [])
    .filter(f => f.status !== 'REJECTED')
    .reduce((sum, f) => sum + f.total, 0);
  const sisaPlafon = Math.max(0, platformConfig.max_additional_fee - feeSudahAda);

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
    // Batas dari platform_settings . sumber yang sama dengan yang ditegakkan
    // backend di AddAdditionalFees, jadi tidak bisa lagi berbeda diam-diam.
    // Dijumlahkan dengan tagihan yang sudah menempel, persis seperti server.
    if (unitPrice * qty > sisaPlafon) {
      setError(
        feeSudahAda > 0
          ? `Sisa plafon pesanan ini tinggal ${formatPrice(sisaPlafon)} (batas ${formatPrice(platformConfig.max_additional_fee)}, sudah diajukan ${formatPrice(feeSudahAda)}).`
          : `Total tagihan tidak boleh melebihi ${formatPrice(platformConfig.max_additional_fee)}`,
      );
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
      setError(pesanGalatPesanan(res, 'Gagal mengajukan biaya tambahan. Coba lagi.'));
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
      <div className="flex min-h-[70vh] flex-col justify-center px-4">
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
    <div className="pb-6">
      <MitraPageHeader
        title="Ajukan Biaya Tambahan"
        variant="form"
        backHref={`/mitra/orders/${orderId}`}
        breadcrumbs={[{ label: 'Pesanan', href: '/mitra/orders' }, { label: 'Biaya Tambahan' }]}
      />

      <MitraPageContainer variant="form">
        <MitraInfoBanner variant="error" icon={<AlertCircle className="h-4 w-4" aria-hidden />} className="mb-4">
          Ajukan biaya tambahan jika ada pergantian sparepart, material ekstra, atau layanan di luar kesepakatan awal.
        </MitraInfoBanner>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-brand-gray-100 p-4 space-y-4 lg:p-5">
          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-1.5">Tipe Biaya</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`block p-3 rounded-lg border text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-blue text-sm font-semibold ${form.type === 'extra_service' ? 'border-brand-red bg-brand-error-soft text-brand-red' : 'border-brand-gray-100 bg-white text-brand-gray-700'}`}>
                <input type="radio" name="type" className="sr-only" checked={form.type === 'extra_service'} onChange={() => setForm({ ...form, type: 'extra_service' })} />
                Layanan
              </label>
              <label className={`block p-3 rounded-lg border text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-blue text-sm font-semibold ${form.type === 'material' ? 'border-brand-red bg-brand-error-soft text-brand-red' : 'border-brand-gray-100 bg-white text-brand-gray-700'}`}>
                <input type="radio" name="type" className="sr-only" checked={form.type === 'material'} onChange={() => setForm({ ...form, type: 'material' })} />
                Material / Sparepart
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-1.5">Nama Item / Layanan</label>
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
              <label className="block text-sm font-semibold text-brand-gray-900 mb-1.5">Harga Satuan</label>
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
              <label className="block text-sm font-semibold text-brand-gray-900 mb-1.5">Kuantitas</label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.quantity || ''}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setForm({ ...form, quantity: '' as any });
                    return;
                  }
                  const q = parseInt(val, 10);
                  if (!isNaN(q)) {
                    setForm({ ...form, quantity: Math.min(100, q) });
                  }
                }}
                onBlur={() => {
                  if (!form.quantity || Number(form.quantity) < 1) {
                    setForm({ ...form, quantity: 1 });
                  }
                }}
                className="w-full p-3 border border-brand-gray-100 rounded-md text-sm font-bold text-brand-gray-900 focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div className="border-t border-brand-gray-100 pt-4 flex justify-between items-center">
            <span className="font-semibold text-brand-gray-900">Total Tagihan:</span>
            <span className="text-xl font-bold text-brand-orange">{formatPrice(totalAmount)}</span>
          </div>

          {/* Sisa plafon disebut di muka, bukan sebagai penolakan setelah
              tombol ditekan . mitra baru tahu batasnya justru saat sudah
              terlanjur menghitung harga bersama pelanggan. */}
          {feeSudahAda > 0 && (
            <p className="text-xs text-brand-gray-450">
              Sudah diajukan pada pesanan ini: {formatPrice(feeSudahAda)}. Sisa plafon {formatPrice(sisaPlafon)}.
            </p>
          )}

          {error && <MitraInfoBanner variant="error" role="alert">{error}</MitraInfoBanner>}

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
      </MitraPageContainer>
    </div>
  );
}
