"use client";
import { useToast } from '@/components/ui/toast';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Pencil, Trash2, X, Home, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Loader2 } from 'lucide-react';
import { unwrapData } from '@/lib/order-utils';


interface Address {
  id: string;
  label: string;
  // Backend: address (alamat lengkap), address_detail (detail/penerima), is_default.
  address: string;
  address_detail?: string;
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
    
    fetchAddresses();
  }, [isAuthenticated]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI<any>('/users/me/addresses');
      if (res.success && res.data) {
        setAddresses(unwrapData(res.data));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
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

  const handleSetPrimary = async (id: string) => {
    const res = await fetchAPI(`/users/me/addresses/${id}/primary`, { method: 'PUT' });
    if (res.success) {
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
      showToast('Berhasil mengatur alamat utama');
    } else {
      showToast(res.message || 'Gagal mengatur alamat utama', 'error');
    }
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">

      <MobilePageHeader title="Buku Alamat" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b]">Buku Alamat</h1>
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-[#e5e2e1] p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-[#e5e2e1] rounded w-1/4" />
              <div className="h-3 bg-[#e5e2e1] rounded w-full" />
              <div className="h-3 bg-[#e5e2e1] rounded w-3/4" />
            </div>
          ))
        ) : addresses.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-[#e5e2e1]">
            <MapPin className="w-12 h-12 text-[#e5e2e1] mx-auto mb-3" />
            <p className="text-sm text-[#5b403e] mb-4">Belum ada alamat tersimpan.</p>
          </div>
        ) : (
          addresses.map(a => (
            <div key={a.id} className={`bg-white rounded-xl border p-4 transition-colors ${a.is_default ? 'border-[#b51822]' : 'border-[#e5e2e1]'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#1c1b1b] flex items-center gap-1.5">
                    {(() => {
                      const l = a.label.toLowerCase();
                      const Icon = l.includes('rumah') || l.includes('home')
                        ? Home
                        : l.includes('kantor') || l.includes('kerja') || l.includes('office')
                          ? Briefcase
                          : MapPin;
                      return <Icon className="w-4 h-4 text-[#b51822] shrink-0" />;
                    })()}
                    {a.label}
                  </h3>
                  {a.is_default && (
                    <span className="bg-[#b51822] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                      Utama
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/profile/addresses/edit/${a.id}`}>
                    <button className="p-1.5 text-[#9e8e8c] hover:text-[#5b403e] hover:bg-[#f7f5f4] rounded transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => setDeleteId(a.id)}
                    className="p-1.5 text-[#9e8e8c] hover:text-[#E53E3E] hover:bg-[#FFF5F5] rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {a.address_detail && <p className="text-sm font-semibold text-[#5b403e]">{a.address_detail}</p>}
              <p className="text-sm text-[#5b403e] mt-1 leading-relaxed">{a.address}</p>

              {!a.is_default && (
                <button
                  onClick={() => handleSetPrimary(a.id)}
                  className="mt-3 text-sm font-semibold text-[#b51822] hover:underline"
                >
                  Jadikan Alamat Utama
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-20">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full bg-[#b51822] hover:bg-[#90121a] rounded"
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
              <h3 className="text-base font-semibold text-[#1c1b1b]">Hapus Alamat?</h3>
              <button onClick={() => setDeleteId(null)}>
                <X className="w-5 h-5 text-[#9e8e8c]" />
              </button>
            </div>
            <p className="text-sm text-[#5b403e] mb-6">
              Alamat ini akan dihapus permanen dari buku alamat Anda.
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

