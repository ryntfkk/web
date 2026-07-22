"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Star, Trash2, Loader2 } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFavoriteServices,
  useFavoritePartners,
  useFavoritesActions,
} from '@/hooks/useFavorites';

import { PLACEHOLDER_SERVICE as PLACEHOLDER_IMG } from '@/lib/images';

function formatPrice(p: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(p);
}

export default function FavoritesPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const { data: services, isLoading: sLoading } = useFavoriteServices();
  const { data: partners, isLoading: pLoading } = useFavoritePartners();
  const { removeService, removePartner } = useFavoritesActions();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'all' | 'services' | 'partners'>('all');

  // Semua hook dipanggil di atas guard — jangan pernah return sebelum hook
  // terpanggil (dulu useState di bawah guard ini → crash "rendered more hooks").
  if (authLoading || !isAuthorized) {
    return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const handleRemoveService = async (id: string) => {
    const res = await removeService(id);
    if (!res.success) showToast(res.message || 'Gagal menghapus favorit', 'error');
  };

  const handleRemovePartner = async (id: string) => {
    const res = await removePartner(id);
    if (!res.success) showToast(res.message || 'Gagal menghapus favorit', 'error');
  };

  const loading = sLoading || pLoading;
  const sCount = services?.length ?? 0;
  const pCount = partners?.length ?? 0;
  const empty = !loading && sCount === 0 && pCount === 0;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      <MobilePageHeader title="Favorit Saya" icon={<Heart className="w-5 h-5 text-[#b51822]" />} />

      <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="hidden lg:flex text-2xl font-bold text-[#1c1b1b] items-center gap-2 mb-6">
        <Heart className="w-6 h-6 text-[#b51822]" /> Favorit Saya
      </h1>
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 border border-[#e5e2e1] rounded-lg p-3 bg-white">
              <Skeleton className="w-14 h-14 rounded-md shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {empty && (
        <EmptyState
          icon={Heart}
          title="Belum Ada Favorit"
          description="Ketuk ikon hati pada layanan atau mitra untuk menyimpannya di sini."
        />
      )}

      {!loading && !empty && (
        <div className="flex gap-2 mb-5">
          {([
            { key: 'all', label: 'Semua', count: sCount + pCount },
            { key: 'services', label: 'Layanan', count: sCount },
            { key: 'partners', label: 'Mitra', count: pCount },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                tab === t.key
                  ? 'bg-[#b51822] text-white border-[#b51822]'
                  : 'bg-white text-[#5b403e] border-[#e5e2e1] hover:border-[#b51822]'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-[#e5e2e1] text-[#5b403e]'}`}>{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && !empty && ((tab === 'services' && sCount === 0) || (tab === 'partners' && pCount === 0)) && (
        <p className="text-center text-sm text-[#8f6f6d] py-8">
          Belum ada {tab === 'services' ? 'layanan' : 'mitra'} favorit.
        </p>
      )}

      {!loading && (tab === 'all' || tab === 'services') && sCount > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#5b403e] mb-3">Layanan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services!.map((f) => (
              <div
                key={f.favorite_id}
                className="flex items-center gap-3 border border-[#e5e2e1] rounded-lg p-3 bg-white"
              >
                <Link href={`/services/${f.service_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    src={f.photo_url || PLACEHOLDER_IMG}
                    alt={f.service_name}
                    className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-[#1c1b1b] truncate">{f.service_name}</p>
                    <p className="text-xs text-[#9e8e8c] truncate">{f.category_name} · {f.partner_name}</p>
                    <p className="text-sm font-semibold text-[#b51822]">{formatPrice(f.price)}</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleRemoveService(f.service_id)}
                  className="text-[#9e8e8c] hover:text-[#b51822] p-1"
                  aria-label="Hapus favorit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && (tab === 'all' || tab === 'partners') && pCount > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#5b403e] mb-3">Mitra</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {partners!.map((f) => (
              <div
                key={f.favorite_id}
                className="flex items-center gap-3 border border-[#e5e2e1] rounded-lg p-3 bg-white"
              >
                <Link href={`/${f.partner_username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    src={f.avatar_url || PLACEHOLDER_IMG}
                    alt={f.partner_name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-[#1c1b1b] truncate">{f.partner_name}</p>
                    <p className="text-xs text-[#9e8e8c] truncate">@{f.partner_username}</p>
                    <p className="text-xs text-[#5b403e] flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current text-yellow-500" />
                      {Number(f.avg_rating).toFixed(1)} ({f.total_reviews})
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => handleRemovePartner(f.partner_id)}
                  className="text-[#9e8e8c] hover:text-[#b51822] p-1"
                  aria-label="Hapus favorit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
