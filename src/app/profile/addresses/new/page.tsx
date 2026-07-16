"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import RegionSelect from '@/components/ui/RegionSelect';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

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
    full_address: '',
    is_primary: false,
    latitude: -6.200000,
    longitude: 106.816666,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.recipient_name || !form.recipient_phone || !form.full_address || !form.province || !form.city || !form.district) {
      setError('Semua kolom wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    // Backend memakai field: label, address, address_detail, city, district, lon, lat, is_default.
    const res = await fetchAPI('/users/me/addresses', {
      method: 'POST',
      body: JSON.stringify({
        label: form.label,
        address: form.full_address,
        address_detail: `Penerima: ${form.recipient_name} (${form.recipient_phone})`,
        province: form.province,
        city: form.city,
        district: form.district,
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
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header */}
      {/* Header khusus mobile — di desktop TopNavbar sudah jadi satu-satunya header. */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10 lg:hidden">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Tambah Alamat Baru</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b] mb-6">Tambah Alamat Baru</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e5e2e1] p-6 space-y-4">
          
          {/* Pin lokasi — koordinat harus cocok dengan alamat (dipakai untuk hitung jarak & ongkos ke basecamp mitra) */}
          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Titik Lokasi (Pinpoint)</label>
            <p className="text-xs text-[#8f6f6d] mb-2">Ketuk peta untuk menandai lokasi persis alamat ini.</p>
            <div className="h-64 border border-[#e5e2e1] rounded-lg overflow-hidden">
              <MapPicker
                lat={form.latitude}
                lng={form.longitude}
                onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Label Alamat</label>
            <input
              type="text"
              placeholder="Contoh: Rumah, Kantor, Apartemen"
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Nama Penerima</label>
              <input
                type="text"
                placeholder="Nama lengkap"
                value={form.recipient_name}
                onChange={e => setForm({ ...form, recipient_name: e.target.value })}
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Nomor HP</label>
              <input
                type="tel"
                placeholder="08123456789"
                value={form.recipient_phone}
                onChange={e => setForm({ ...form, recipient_phone: e.target.value })}
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
          </div>

          <RegionSelect
            value={{ province: form.province, city: form.city, district: form.district }}
            onChange={(v) => setForm({ ...form, ...v })}
          />

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Alamat Lengkap</label>
            <textarea
              placeholder="Jalan, RT/RW, Patokan..."
              value={form.full_address}
              onChange={e => setForm({ ...form, full_address: e.target.value })}
              rows={3}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] resize-none"
            />
          </div>

          <label className="flex items-center gap-3 p-4 border border-[#e5e2e1] rounded-lg cursor-pointer hover:bg-[#f7f5f4] transition-colors">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={e => setForm({ ...form, is_primary: e.target.checked })}
              className="w-4 h-4 text-[#b51822] focus:ring-[#b51822] border-[#e5e2e1] rounded"
            />
            <span className="text-sm font-semibold text-[#1c1b1b]">Jadikan Alamat Utama</span>
          </label>

          {error && <p className="text-sm text-[#E53E3E] bg-[#FFF5F5] p-3 rounded">{error}</p>}
        </form>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-20">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full bg-[#b51822] hover:bg-[#90121a] rounded"
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

