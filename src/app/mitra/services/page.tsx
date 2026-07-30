"use client";
import { useToast } from '@/components/ui/toast';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Plus, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import MobilePageHeader from '@/components/layout/MobilePageHeader';


interface Service {
  id: string;
  name: string;
  price: number;
  estimated_duration?: number;
  description?: string;
  is_active: boolean;
}

export default function MitraServicesPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();


  useEffect(() => {
    if (!isAuthenticated) return;
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
      showToast('Layanan berhasil dihapus');
    } else {
      showToast(res.message || 'Gagal menghapus layanan', 'error');
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
      showToast('Status layanan berhasil diubah');
    } else {
      showToast(res.message || 'Gagal mengubah status layanan', 'error');
    }
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">

      {/* Header */}
      <MobilePageHeader
        alwaysShow
        title="Layanan Anda"
        right={
          <Link
            href="/mitra/services/new"
            aria-label="Tambah layanan"
            className="text-brand-red hover:bg-brand-error-soft p-2 rounded-full transition-colors inline-flex"
          >
            <Plus className="w-5 h-5" />
          </Link>
        }
      />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-brand-gray-100 p-4 h-24 animate-pulse" />
          ))
        ) : services.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-brand-gray-100">
            <Wrench className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />
            <p className="text-sm text-brand-gray-700 mb-4">Anda belum menambahkan layanan.</p>
            <Button onClick={() => router.push('/mitra/services/new')} className="bg-brand-red hover:bg-brand-red-dark">
              Tambah Layanan
            </Button>
          </div>
        ) : (
          services.map(s => (
            <div key={s.id} className={`bg-white rounded-xl border p-4 transition-colors ${s.is_active ? 'border-brand-gray-100' : 'border-brand-gray-100 opacity-70 bg-brand-gray-60'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-brand-gray-900">{s.name}</h3>
                  <p className="text-xs text-brand-gray-450 mt-0.5">{s.estimated_duration} Menit</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-red">{formatPrice(s.price)}</p>
                </div>
              </div>
              
              {s.description && (
                <p className="text-sm text-brand-gray-700 mb-3 line-clamp-2">{s.description}</p>
              )}

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-brand-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s.is_active}
                    onChange={() => handleToggleActive(s.id, s.is_active)}
                    className="w-4 h-4 text-brand-success rounded focus:ring-brand-success"
                  />
                  <span className="text-xs font-semibold text-brand-gray-700">{s.is_active ? 'Aktif' : 'Nonaktif'}</span>
                </label>
                
                <div className="flex items-center gap-1">
                  <Link href={`/mitra/services/${s.id}/edit`}>
                    <button className="p-2 text-brand-gray-450 hover:text-brand-red hover:bg-brand-error-soft rounded transition-colors" aria-label="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </Link>
                  <button onClick={() => setDeleteId(s.id)} className="p-2 text-brand-gray-450 hover:text-brand-error hover:bg-brand-error-soft rounded transition-colors" aria-label="Hapus">
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
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-brand-gray-900">Hapus Layanan?</h3>
              <button onClick={() => setDeleteId(null)} aria-label="Tutup">
                <X className="w-5 h-5 text-brand-gray-450" />
              </button>
            </div>
            <p className="text-sm text-brand-gray-700 mb-6">
              Layanan yang dihapus tidak akan tersedia lagi untuk dipesan oleh pelanggan.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded border-brand-gray-100" onClick={() => setDeleteId(null)}>
                Batal
              </Button>
              <Button className="flex-1 bg-brand-error hover:bg-brand-error-dark rounded" onClick={handleDelete}>
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

