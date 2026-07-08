"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { ROLE_PARTNER } from '@/lib/constants';

export default function NewMitraServicePage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    price: '',
    duration_minutes: '60',
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated || user?.active_role !== ROLE_PARTNER) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseInt(form.price.replace(/\D/g, ''), 10);
    const numDuration = parseInt(form.duration_minutes, 10);

    if (!form.name || !numPrice || !numDuration) {
      setError('Nama, harga, dan durasi wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetchAPI('/partners/me/services', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        price: numPrice,
        duration_minutes: numDuration,
        description: form.description,
        is_active: true
      })
    });

    if (res.success) {
      router.push('/mitra/services');
    } else {
      setError(res.message || 'Gagal menambahkan layanan');
      setLoading(false);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setForm({ ...form, price: '' });
      return;
    }
    setForm({ ...form, price: new Intl.NumberFormat('id-ID').format(parseInt(val, 10)) });
  };

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Tambah Layanan Baru</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e5e2e1] p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Nama Layanan</label>
            <input
              type="text"
              placeholder="Contoh: Cuci AC 0.5 - 1 PK"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Harga</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c1b1b] font-bold text-sm">Rp</span>
                <input
                  type="text"
                  value={form.price}
                  onChange={handlePriceChange}
                  placeholder="0"
                  className="w-full p-3 pl-10 border border-[#e5e2e1] rounded text-sm font-bold text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Estimasi Durasi (Menit)</label>
              <input
                type="number"
                min="15"
                step="15"
                value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Deskripsi <span className="text-[#9e8e8c] font-normal">(opsional)</span></label>
            <textarea
              placeholder="Deskripsi detail tentang layanan ini..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] resize-none"
            />
          </div>

          {error && <div className="bg-[#FFF5F5] text-[#E53E3E] text-sm p-3 rounded-lg border border-[#FEB2B2]">{error}</div>}

          <div className="pt-4 border-t border-[#e5e2e1]">
            <Button
              className="w-full bg-[#b51822] hover:bg-[#90121a] rounded h-12 text-base font-bold"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan Layanan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
