"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Star, Trash2 } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
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
  const router = useRouter();
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const { data: services, isLoading: sLoading } = useFavoriteServices();
  const { data: partners, isLoading: pLoading } = useFavoritePartners();
  const { removeService, removePartner } = useFavoritesActions();

  if (authLoading || !isAuthorized) {
    return <div className="p-6 text-center text-gray-500">Memuat…</div>;
  }

  const loading = sLoading || pLoading;
  const empty = !loading && (services?.length ?? 0) === 0 && (partners?.length ?? 0) === 0;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header khusus mobile — di desktop TopNavbar sudah jadi satu-satunya header. */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10 lg:hidden">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b] flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#b51822]" /> Favorit Saya
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="hidden lg:flex text-2xl font-bold text-[#1c1b1b] items-center gap-2 mb-6">
        <Heart className="w-6 h-6 text-[#b51822]" /> Favorit Saya
      </h1>
      {loading && <div className="text-gray-500 py-8 text-center">Memuat favorit…</div>}

      {empty && (
        <div className="text-center text-gray-500 py-12">
          Belum ada favorit. Ketuk ikon hati pada layanan atau mitra untuk menyimpannya.
        </div>
      )}

      {!loading && (services?.length ?? 0) > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#5b403e] mb-3">Layanan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services!.map((f) => (
              <div
                key={f.favorite_id}
                className="flex items-center gap-3 border border-[#e5e2e1] rounded-lg p-3 bg-white"
              >
                <Link href={`/services?id=${f.service_id}`} className="flex items-center gap-3 flex-1 min-w-0">
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
                  onClick={() => removeService(f.service_id)}
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

      {!loading && (partners?.length ?? 0) > 0 && (
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
                  onClick={() => removePartner(f.partner_id)}
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
