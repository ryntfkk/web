"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Plus, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description?: string;
  is_active: boolean;
}

export default function MitraServicesPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.active_role !== 'mitra') { router.push('/'); return; }
    fetchServices();
  }, [isAuthenticated, user?.active_role]);

  const fetchServices = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/partners/me/services');
    if (res.success && res.data) {
      setServices(res.data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/partners/me/services/${deleteId}`, { method: 'DELETE' });
    if (res.success) {
      setServices(services.filter(s => s.id !== deleteId));
    }
    setDeleteId(null);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const res = await fetchAPI(`/partners/me/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !currentStatus })
    });
    if (res.success) {
      setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
    }
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  if (!isAuthenticated || user?.active_role !== 'mitra') return null;

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </button>
            <h1 className="text-base font-bold text-[#1c1b1b]">Layanan Anda</h1>
          </div>
          <Link href="/mitra/services/new">
            <button className="text-[#b51822] hover:bg-[#FFF5F5] p-2 rounded-full transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-[#e5e2e1] p-4 h-24 animate-pulse" />
          ))
        ) : services.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-[#e5e2e1]">
            <Wrench className="w-12 h-12 text-[#e5e2e1] mx-auto mb-3" />
            <p className="text-sm text-[#5b403e] mb-4">Anda belum menambahkan layanan.</p>
            <Button onClick={() => router.push('/mitra/services/new')} className="bg-[#b51822] hover:bg-[#90121a]">
              Tambah Layanan
            </Button>
          </div>
        ) : (
          services.map(s => (
            <div key={s.id} className={`bg-white rounded-xl border p-4 transition-colors ${s.is_active ? 'border-[#e5e2e1]' : 'border-[#e5e2e1] opacity-70 bg-[#f7f5f4]'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-[#1c1b1b]">{s.name}</h3>
                  <p className="text-xs text-[#9e8e8c] mt-0.5">{s.duration_minutes} Menit</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#b51822]">{formatPrice(s.price)}</p>
                </div>
              </div>
              
              {s.description && (
                <p className="text-sm text-[#5b403e] mb-3 line-clamp-2">{s.description}</p>
              )}

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#e5e2e1]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s.is_active}
                    onChange={() => handleToggleActive(s.id, s.is_active)}
                    className="w-4 h-4 text-[#38A169] rounded focus:ring-[#38A169]"
                  />
                  <span className="text-xs font-semibold text-[#5b403e]">{s.is_active ? 'Aktif' : 'Nonaktif'}</span>
                </label>
                
                <div className="flex items-center gap-1">
                  <Link href={`/mitra/services/${s.id}/edit`}>
                    <button className="p-2 text-[#9e8e8c] hover:text-[#b51822] hover:bg-[#FFF5F5] rounded transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </Link>
                  <button onClick={() => setDeleteId(s.id)} className="p-2 text-[#9e8e8c] hover:text-[#E53E3E] hover:bg-[#FFF5F5] rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1c1b1b]">Hapus Layanan?</h3>
              <button onClick={() => setDeleteId(null)}>
                <X className="w-5 h-5 text-[#9e8e8c]" />
              </button>
            </div>
            <p className="text-sm text-[#5b403e] mb-6">
              Layanan yang dihapus tidak akan tersedia lagi untuk dipesan oleh pelanggan.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded border-[#e5e2e1]" onClick={() => setDeleteId(null)}>
                Batal
              </Button>
              <Button className="flex-1 bg-[#E53E3E] hover:bg-[#C53030] rounded" onClick={handleDelete}>
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
