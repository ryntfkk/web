"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import RegionSelect from '@/components/ui/RegionSelect';
import dynamic from 'next/dynamic';

// Leaflet mengakses `window` saat import → harus dynamic + ssr:false.
const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 flex items-center justify-center rounded-lg animate-pulse"><MapPin className="w-8 h-8 text-gray-300" /></div>,
});


export default function NewAddressPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    label: '',
    recipient_name: '',
    recipient_phone: '',
    province: '',
    city: '',
    district: '',
    postal_code: '',
    full_address: '',
    is_primary: false,
    latitude: -6.200000,
    longitude: 106.816666,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Koordinat awal hanya PUSAT peta (Jakarta); pin dianggap valid hanya setelah
  // user benar-benar mengetuk peta. Mencegah alamat luar-Jakarta tersimpan dengan
  // koordinat Jakarta → ongkos transport ke basecamp mitra jadi salah.
  const [pinSet, setPinSet] = useState(false);

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  if (!isAuthorized) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.recipient_name || !form.recipient_phone || !form.full_address || !form.province || !form.city || !form.district) {
      setError('Semua kolom wajib diisi');
      return;
    }
    const phoneDigits = form.recipient_phone.replace(/\D/g, '');
    if (!/^(0|62)\d{8,13}$/.test(phoneDigits)) {
      setError('Nomor HP penerima tidak valid (contoh: 08123456789)');
      return;
    }
    if (form.postal_code && !/^\d{5}$/.test(form.postal_code)) {
      setError('Kode pos harus 5 digit angka');
      return;
    }
    if (!pinSet) {
      setError('Tandai titik lokasi alamat pada peta terlebih dahulu');
      return;
    }

    setLoading(true);
    setError('');

    // Backend memakai field: label, address, address_detail, city, district, province, postal_code, lon, lat, is_default.
    const res = await fetchAPI('/users/me/addresses', {
      method: 'POST',
      body: JSON.stringify({
        label: form.label,
        address: form.full_address,
        address_detail: `Penerima: ${form.recipient_name} (${form.recipient_phone})`,
        province: form.province,
        city: form.city,
        district: form.district,
        postal_code: form.postal_code,
        lon: form.longitude,
        lat: form.latitude,
        is_default: form.is_primary,
      })
    });

    if (res.success) {
      router.push('/profile/addresses');
    } else {
      setError(res.message || 'Gagal menyimpan alamat');
      setLoading(false);
    }
  };

  return (
    // pb-20 untuk memberi ruang fixed action bar "Simpan Alamat" di semua breakpoint.
    <div className="page-h bg-brand-gray-60 pb-20">
      <MobilePageHeader title="Tambah Alamat Baru" />

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-6">Tambah Alamat Baru</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-brand-gray-100 p-6 space-y-4">

          {/* Pin lokasi . koordinat harus cocok dengan alamat (dipakai untuk hitung jarak & ongkos ke basecamp mitra) */}
          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Titik Lokasi (Pinpoint)</label>
            <p className="text-xs text-brand-gray-400 mb-2">Ketuk peta untuk menandai lokasi persis alamat ini.</p>
            <div className="h-64 border border-brand-gray-100 rounded-lg overflow-hidden">
              <MapPicker
                lat={form.latitude}
                lng={form.longitude}
                onChange={(lat, lng) => { setForm({ ...form, latitude: lat, longitude: lng }); setPinSet(true); }}
              />
            </div>
            <p className={`text-xs mt-1.5 flex items-center gap-1 ${pinSet ? 'text-brand-success' : 'text-brand-orange'}`}>
              <MapPin className="w-3.5 h-3.5" />
              {pinSet ? 'Titik lokasi sudah ditandai.' : 'Titik lokasi belum ditandai - ketuk peta.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Label Alamat</label>
            <input
              type="text"
              placeholder="Contoh: Rumah, Kantor, Apartemen"
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Nama Penerima</label>
              <input
                type="text"
                placeholder="Nama lengkap"
                value={form.recipient_name}
                onChange={e => setForm({ ...form, recipient_name: e.target.value })}
                className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Nomor HP</label>
              <input
                type="tel"
                placeholder="08123456789"
                value={form.recipient_phone}
                onChange={e => setForm({ ...form, recipient_phone: e.target.value })}
                className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <RegionSelect
            value={{ province: form.province, city: form.city, district: form.district }}
            onChange={(v) => setForm({ ...form, ...v })}
          />

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Kode Pos (opsional)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="Contoh: 12345"
              value={form.postal_code}
              onChange={e => setForm({ ...form, postal_code: e.target.value.replace(/\D/g, '') })}
              className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Alamat Lengkap</label>
            <textarea
              placeholder="Jalan, RT/RW, Patokan..."
              value={form.full_address}
              onChange={e => setForm({ ...form, full_address: e.target.value })}
              rows={3}
              className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red resize-none"
            />
          </div>

          <label className="flex items-center gap-3 p-4 border border-brand-gray-100 rounded-lg cursor-pointer hover:bg-brand-gray-60 transition-colors">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={e => setForm({ ...form, is_primary: e.target.checked })}
              className="w-4 h-4 text-brand-red focus:ring-brand-red border-brand-gray-100 rounded"
            />
            <span className="text-sm font-semibold text-brand-gray-900">Jadikan Alamat Utama</span>
          </label>

          {error && <p className="text-sm text-brand-error bg-brand-error-soft p-3 rounded-lg">{error}</p>}
        </form>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-gray-100 px-4 py-3 z-20">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full bg-brand-red hover:bg-brand-red-dark rounded"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan Alamat'}
          </Button>
        </div>
      </div>
    </div>
  );
}

