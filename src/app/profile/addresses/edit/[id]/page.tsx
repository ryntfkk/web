"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { unwrapData } from '@/lib/order-utils';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Leaflet mengakses `window` saat import → dynamic + ssr:false.
const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 flex items-center justify-center rounded-lg animate-pulse"><MapPin className="w-8 h-8 text-gray-300" /></div>,
});

interface Address {
  id: string;
  label: string;
  address: string;
  address_detail?: string;
  city?: string;
  district?: string;
  is_default: boolean;
  lon?: number;
  lat?: number;
}

export default function EditAddressPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [form, setForm] = useState({
    label: '',
    address: '',
    address_detail: '',
    city: '',
    district: '',
    is_default: false,
    lon: 106.816666,
    lat: -6.2,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthorized) return;
    const load = async () => {
      setLoading(true);
      const res = await fetchAPI<Address[]>('/users/me/addresses');
      if (res.success && res.data) {
        const list = unwrapData<Address[]>(res.data);
        const a = Array.isArray(list) ? list.find((x) => x.id === id) : undefined;
        if (a) {
          setForm({
            label: a.label || '',
            address: a.address || '',
            address_detail: a.address_detail || '',
            city: a.city || '',
            district: a.district || '',
            is_default: Boolean(a.is_default),
            lon: a.lon ?? 106.816666,
            lat: a.lat ?? -6.2,
          });
        } else {
          setError('Alamat tidak ditemukan');
        }
      }
      setLoading(false);
    };
    load();
  }, [isAuthorized, id]);

  if (authLoading || loading) {
    return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!isAuthorized) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.address) {
      setError('Label dan alamat lengkap wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetchAPI(`/users/me/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        label: form.label,
        address: form.address,
        address_detail: form.address_detail,
        city: form.city,
        district: form.district,
        lon: form.lon,
        lat: form.lat,
        is_default: form.is_default,
      }),
    });
    if (res.success) {
      router.push('/profile/addresses');
    } else {
      setError(res.message || 'Gagal menyimpan alamat');
      setSaving(false);
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
          <h1 className="text-base font-bold text-[#1c1b1b]">Edit Alamat</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b] mb-6">Edit Alamat</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e5e2e1] p-6 space-y-4">
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

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Alamat Lengkap</label>
            <textarea
              placeholder="Jalan, RT/RW, Patokan..."
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              rows={3}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Kota / Kabupaten</label>
              <input
                type="text"
                placeholder="mis. Kota Semarang"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Kecamatan</label>
              <input
                type="text"
                placeholder="mis. Tembalang"
                value={form.district}
                onChange={e => setForm({ ...form, district: e.target.value })}
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Detail / Catatan (opsional)</label>
            <input
              type="text"
              placeholder="Penerima, patokan, dsb."
              value={form.address_detail}
              onChange={e => setForm({ ...form, address_detail: e.target.value })}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Titik Lokasi (Pinpoint)</label>
            <p className="text-xs text-[#8f6f6d] mb-2">Ketuk peta untuk memperbarui lokasi persis alamat ini.</p>
            <div className="h-64 border border-[#e5e2e1] rounded-lg overflow-hidden">
              <MapPicker
                lat={form.lat}
                lng={form.lon}
                onChange={(lat, lng) => setForm({ ...form, lat, lon: lng })}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 border border-[#e5e2e1] rounded-lg cursor-pointer hover:bg-[#f7f5f4] transition-colors">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={e => setForm({ ...form, is_default: e.target.checked })}
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
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
