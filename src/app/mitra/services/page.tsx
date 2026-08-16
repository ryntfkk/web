"use client";
import { useToast } from '@/components/ui/toast';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Plus, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { track } from '@/lib/analytics';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import DataState from '@/components/mitra/DataState';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import MitraModal from '@/components/mitra/MitraModal';
import MitraInfoBanner from '@/components/mitra/MitraInfoBanner';
import { useLiveRegion } from '@/components/mitra/useLiveRegion';


interface Service {
  id: string;
  name: string;
  price: number;
  estimated_duration?: number;
  description?: string;
  is_active: boolean;
  /**
   * false = kategori layanan ini (atau induknya) dinonaktifkan admin. Layanan
   * TIDAK tampil ke pelanggan meski `is_active` true . dan itu satu-satunya
   * cara mitra bisa tahu, karena dari sisinya semua terlihat normal.
   */
  category_visible?: boolean;
  category_name?: string;
}

export default function MitraServicesPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  // Toast dirender di luar alur baca dan tanpa role status; tanpa live region
  // pengguna pembaca layar tidak pernah tahu toggle/hapus barusan berhasil.
  const { announce, liveRegion } = useLiveRegion();


  const fetchServices = useCallback(async () => {
    setLoading(true);
    const res = await fetchAPI<Service[]>('/partners/me/services');
    if (res.success) {
      setServices(res.data ?? []);
      setError(null);
    } else {
      // Halaman ini dulu diam saja saat gagal: daftar tetap kosong dan mitra
      // mengira layanannya hilang (P1-11).
      setError(res.message || 'Gagal memuat layanan');
    }
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchServices();
    // active_role ikut jadi dependensi: berpindah mode harus memuat ulang daftar.
  }, [isAuthenticated, user?.active_role, fetchServices]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/partners/me/services/${deleteId}`, { method: 'DELETE' });
    if (res.success) {
      setServices(services.filter(s => s.id !== deleteId));
      showToast('Layanan berhasil dihapus');
      announce('Layanan berhasil dihapus');
    } else {
      const msg = res.message || 'Gagal menghapus layanan';
      showToast(msg, 'error');
      announce(msg, 'assertive');
    }
    setDeleteId(null);
  };

  // Endpoint khusus availability (P0-01). PATCH /partners/me/services/:id
  // menuntut payload layanan LENGKAP . mengirim `{is_active}` ke sana berarti
  // menimpa layanan dengan field kosong, dan `is_active` bahkan tidak ada di
  // DTO-nya sehingga toggle tidak pernah benar-benar bekerja.
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (togglingId) return;
    setTogglingId(id);
    try {
      const res = await fetchAPI<{ id: string; is_active: boolean }>(
        `/partners/me/services/${id}/availability`,
        { method: 'PATCH', body: JSON.stringify({ is_active: !currentStatus }) },
      );
      if (res.success && res.data) {
        // Pakai keadaan dari server, bukan negasi lokal: kalau server menolak
        // perubahan, UI tidak boleh menampilkan keadaan yang tidak nyata.
        const next = res.data.is_active;
        setServices(prev => prev.map(s => (s.id === id ? { ...s, is_active: next } : s)));
        track('partner_service_availability_changed', { service_id: id, is_active: next });
        const msg = next ? 'Layanan diaktifkan' : 'Layanan dinonaktifkan';
        showToast(msg);
        announce(msg);
      } else {
        const msg = res.message || 'Gagal mengubah status layanan';
        showToast(msg, 'error');
        announce(msg, 'assertive');
      }
    } finally {
      setTogglingId(null);
    }
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="pb-6">

      {/* Header */}
      {liveRegion}

      <MitraPageHeader
        title="Layanan Anda"
        variant="list"
        backHref="/mitra/dashboard"
        breadcrumbs={[{ label: 'Dashboard', href: '/mitra/dashboard' }, { label: 'Layanan' }]}
        // Halaman kelola layanan bebas ajakan verifikasi (permintaan pemilik).
        hidePreparationNotice
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

      <MitraPageContainer variant="list">
      {/* Lebar halaman TIDAK dioper lewat `className` DataState . di cabang
          error/empty kelas itu dulu menempel ke kartunya. */}
      <DataState
        isLoading={loading}
        error={error}
        onRetry={fetchServices}
        isEmpty={services.length === 0}
        emptyIcon={<Wrench className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />}
        emptyTitle="Kamu belum menambahkan layanan."
        emptyAction={
          <Button onClick={() => router.push('/mitra/services/new')} className="bg-brand-red hover:bg-brand-red-dark">
            Tambah Layanan
          </Button>
        }
        skeleton={
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg border border-brand-gray-100 p-4 h-24 animate-pulse" />
            ))}
          </div>
        }
      >
        {/* Ruang desktop dipakai untuk KOLOM, bukan meregangkan kartu (§6.1). */}
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {services.map(s => (
            <div key={s.id} className={`bg-white rounded-lg border p-3 transition-colors ${s.is_active ? 'border-brand-gray-100' : 'border-brand-gray-100 opacity-70 bg-brand-gray-60'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-brand-gray-900">{s.name}</h3>
                  <p className="text-xs text-brand-gray-450 mt-0.5">{s.estimated_duration} Menit</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-red">{formatPrice(s.price)}</p>
                </div>
              </div>

              {s.category_visible === false && (
                <MitraInfoBanner variant="warning" className="mb-2">
                  Kategori{s.category_name ? ` ${s.category_name}` : ''} sedang dinonaktifkan admin —
                  layanan ini belum tampil untuk pelanggan.
                </MitraInfoBanner>
              )}

              {s.description && (
                <p className="text-sm text-brand-gray-700 mb-2.5 line-clamp-2">{s.description}</p>
              )}

              <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-brand-gray-100">
                <label className={`flex items-center gap-2 ${togglingId ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={s.is_active}
                    disabled={!!togglingId}
                    onChange={() => handleToggleActive(s.id, s.is_active)}
                    className="w-4 h-4 text-brand-success rounded-md focus:ring-brand-success disabled:cursor-wait"
                  />
                  <span className="text-xs font-semibold text-brand-gray-700">
                    {togglingId === s.id ? 'Menyimpan…' : s.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </label>

                <div className="flex items-center gap-1">
                  <Link href={`/mitra/services/${s.id}/edit`}>
                    <button className="p-2 text-brand-gray-450 hover:text-brand-red hover:bg-brand-error-soft rounded-md transition-colors" aria-label="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </Link>
                  <button onClick={() => setDeleteId(s.id)} className="p-2 text-brand-gray-450 hover:text-brand-error hover:bg-brand-error-soft rounded-md transition-colors" aria-label="Hapus">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DataState>
      </MitraPageContainer>

      <MitraModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Hapus Layanan?"
        description="Layanan yang dihapus tidak akan tersedia lagi untuk dipesan oleh pelanggan."
        footer={
          <>
            <Button variant="outline" className="flex-1 rounded-md border-brand-gray-100" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button className="flex-1 rounded-md bg-brand-error hover:bg-brand-error-dark" onClick={handleDelete}>
              Ya, Hapus
            </Button>
          </>
        }
      />

    </div>
  );
}

