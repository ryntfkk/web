"use client";
import { useToast } from '@/components/ui/toast';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Pencil, Trash2, X, Home, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';


interface Address {
  id: string;
  label: string;
  // Backend: address (alamat lengkap), address_detail (detail/penerima), postal_code, is_default.
  address: string;
  address_detail?: string;
  postal_code?: string;
  is_default: boolean;
}

export default function AddressesPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();


  useEffect(() => {
    // Tunggu auth selesai (silent refresh) sebelum fetch . tanpa gate ini
    // request pertama terkirim tanpa token dan gagal 401.
    if (isAuthenticated) {
      fetchAddresses();
    }
  }, [isAuthenticated]);

  async function fetchAddresses() {
    setLoading(true);
    try {
      const res = await fetchAPI<any>('/users/me/addresses');
      if (res.success && res.data) {
        setAddresses(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetchAPI(`/users/me/addresses/${deleteId}`, { method: 'DELETE' });
    if (res.success) {
      setAddresses(prev => prev.filter(a => a.id !== deleteId));
      showToast('Alamat berhasil dihapus');
    } else {
      showToast(res.message || 'Gagal menghapus alamat', 'error');
    }
    setDeleteId(null);
  };

  async function handleSetPrimary(id: string) {
    const res = await fetchAPI(`/users/me/addresses/${id}/primary`, { method: 'PUT' });
    if (res.success) {
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
      showToast('Berhasil mengatur alamat utama');
    } else {
      showToast(res.message || 'Gagal mengatur alamat utama', 'error');
    }
  };

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  if (!isAuthorized) return null;

  return (
    // pb-20 untuk memberi ruang fixed action bar "Tambah Alamat" di semua breakpoint.
    <div className="page-h bg-brand-gray-60 pb-20">

      {/* titleAs="p": H1 halaman ada di badan konten . tanpa ini HTML memuat DUA H1 sekaligus (audit A6). */}
      <MobilePageHeader
        titleAs="p" title={loading ? 'Buku Alamat' : `Buku Alamat (${addresses.length}/5)`} maxWidthClass="max-w-2xl" />

      {/* max-w-2xl: seragam dgn sub-halaman /profile lain, dan sejajar dgn
          bar aksi di bawah (B2). */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900">
          Buku Alamat
          {/* Kuota 5 alamat ditampilkan di muka . jangan biarkan pengguna kaget
              saat tombol tambah tiba-tiba nonaktif. */}
          {!loading && <span className="ml-2 text-base font-normal text-brand-gray-450">{addresses.length}/5</span>}
        </h1>
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-brand-gray-100 p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-brand-gray-100 rounded w-1/4" />
              <div className="h-3 bg-brand-gray-100 rounded w-full" />
              <div className="h-3 bg-brand-gray-100 rounded w-3/4" />
            </div>
          ))
        ) : addresses.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-brand-gray-100">
            <MapPin className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />
            <p className="text-sm text-brand-gray-700 mb-4">Belum ada alamat tersimpan.</p>
          </div>
        ) : (
          addresses.map(a => (
            <div key={a.id} className={`bg-white rounded-xl border p-4 transition-colors ${a.is_default ? 'border-brand-red' : 'border-brand-gray-100'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-brand-gray-900 flex items-center gap-1.5">
                    {(() => {
                      const l = a.label.toLowerCase();
                      const Icon = l.includes('rumah') || l.includes('home')
                        ? Home
                        : l.includes('kantor') || l.includes('kerja') || l.includes('office')
                          ? Briefcase
                          : MapPin;
                      return <Icon className="w-4 h-4 text-brand-red shrink-0" />;
                    })()}
                    {a.label}
                  </h3>
                  {a.is_default && (
                    <span className="bg-brand-red text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                      Utama
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/profile/addresses/edit/${a.id}`}>
                    <button aria-label="Edit alamat" className="p-1.5 text-brand-gray-450 hover:text-brand-gray-700 hover:bg-brand-gray-60 rounded transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => setDeleteId(a.id)}
                    aria-label="Hapus alamat"
                    className="p-1.5 text-brand-gray-450 hover:text-brand-error hover:bg-brand-error-soft rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {a.address_detail && <p className="text-sm font-semibold text-brand-gray-700">{a.address_detail}</p>}
              <p className="text-sm text-brand-gray-700 mt-1 leading-relaxed">
                {a.address}
                {a.postal_code ? ` (Kode Pos: ${a.postal_code})` : ''}
              </p>

              {!a.is_default && (
                <button
                  onClick={() => handleSetPrimary(a.id)}
                  className="mt-3 text-sm font-semibold text-brand-red hover:underline"
                >
                  Jadikan Alamat Utama
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-gray-100 px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto">
          <Button
            className="w-full bg-brand-red hover:bg-brand-red-dark rounded"
            onClick={() => router.push('/profile/addresses/new')}
            disabled={addresses.length >= 5}
          >
            {addresses.length >= 5 ? 'Maksimal 5 Alamat' : '+ Tambah Alamat Baru'}
          </Button>
        </div>
      </div>

      {/* Delete Dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-brand-gray-900">Hapus Alamat?</h3>
              <button onClick={() => setDeleteId(null)}>
                <X className="w-5 h-5 text-brand-gray-450" />
              </button>
            </div>
            <p className="text-sm text-brand-gray-700 mb-6">
              Alamat ini akan dihapus permanen dari buku alamat Anda.
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

