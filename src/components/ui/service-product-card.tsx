'use client';

import { getInitial } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, MapPin, ShieldCheck, Heart } from 'lucide-react';
import type { PublicService } from '@/hooks/usePublicServices';
import { PLACEHOLDER_SERVICE } from '@/lib/images';
import { formatDistanceMeters } from '@/lib/distance';
import { useAuthStore } from '@/lib/store/authStore';
import { useFavoriteServices, useFavoritesActions } from '@/hooks/useFavorites';
import { useToast } from '@/components/ui/toast';

/** Ringkas jumlah pesanan: 1.200 → "1,2rb+", 15 → "15". */
function formatOrderCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k.toFixed(k >= 10 || Number.isInteger(k) ? 0 : 1).replace('.', ',')}rb+`;
  }
  return `${n}`;
}

// Ambang badge "Terpercaya" (gaya Star Seller / Power Merchant): performa nyata
// (banyak pesanan selesai + rating tinggi), bukan sekadar terdaftar — jadi badge
// tampil selektif, bukan di semua kartu. Tunable.
const TRUSTED_MIN_ORDERS = 20;
const TRUSTED_MIN_RATING = 4.7;

// Kartu satu produk jasa (dipakai di Home "Produk & Layanan" dan hasil pencarian).
// Menautkan ke detail jasa /services?id=...
export function ServiceProductCard({ service }: { service: PublicService }) {
  const distance = formatDistanceMeters(service.distance_meters);
  const orderCount = service.total_orders ?? 0;
  const isTrusted =
    orderCount >= TRUSTED_MIN_ORDERS && (service.partner_avg_rating ?? 0) >= TRUSTED_MIN_RATING;

  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: favServices } = useFavoriteServices();
  const { addService, removeService } = useFavoritesActions();
  const { showToast } = useToast();
  const [favBusy, setFavBusy] = useState(false);
  const isFav = !!favServices?.some((f) => f.service_id === service.id);

  const handleFavToggle = async (e: React.MouseEvent) => {
    // Kartu dibungkus <Link> → cegah navigasi saat menekan hati.
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/services?id=${service.id}`)}`);
      return;
    }
    if (favBusy) return;
    setFavBusy(true);
    try {
      const res = isFav ? await removeService(service.id) : await addService(service.id);
      if (!res.success) showToast(res.message || 'Gagal mengubah favorit', 'error');
    } finally {
      setFavBusy(false);
    }
  };

  return (
    <Link href={`/services?id=${service.id}&distance=${service.distance_meters || 0}`} className="block">
      <div className="bg-white border border-brand-gray-100 rounded-xs overflow-hidden hover:shadow-md transition-all h-full flex flex-col">
        {/* Image */}
        <div className="relative w-full aspect-square bg-brand-gray-100 flex-shrink-0">
          <Image
            src={service.photo_url || PLACEHOLDER_SERVICE}
            alt={service.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          />
          {/* Availability badge - top left */}
          {service.partner_is_online && (
            <div className="absolute top-1.5 left-1.5 bg-brand-success/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold leading-none">
              Tersedia Hari Ini
            </div>
          )}
          {/* Verified badge - top left (only if no availability badge overlaps) */}
          {service.partner_is_verified && !service.partner_is_online && (
            <div className="absolute top-1.5 left-1.5 bg-brand-info/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span className="text-[9px] sm:text-[10px] font-semibold leading-none">Terverifikasi</span>
            </div>
          )}

          {/* Favorite heart - top right (aksi cepat simpan favorit dari daftar) */}
          <button
            type="button"
            onClick={handleFavToggle}
            disabled={favBusy}
            aria-label={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
            aria-pressed={isFav}
            className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-95 transition-transform disabled:opacity-60"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-brand-red text-brand-red' : 'text-brand-gray-700'}`} />
          </button>

          {/* Distance Badge - bottom right */}
          {distance && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              <span className="text-[10px] sm:text-[11px] font-medium leading-none">{distance}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2 sm:p-3 flex flex-col flex-1">
          {/* Service Name */}
          <h3 className="text-[13px] sm:text-[14px] font-semibold text-brand-gray-900 line-clamp-2 mb-1">
            {service.name}
          </h3>

          {/* Vendor */}
          <div className="flex items-center gap-1 mb-2 min-w-0">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-brand-gray-100 overflow-hidden flex-shrink-0">
              {service.partner_avatar_url ? (
                <Image
                  src={service.partner_avatar_url}
                  alt={service.partner_name}
                  width={20}
                  height={20}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] sm:text-[10px] font-medium text-brand-gray-700">
                  {getInitial(service.partner_name || '')}
                </div>
              )}
            </div>
            <span className="text-[11px] sm:text-[12px] text-brand-gray-700 truncate">
              {service.partner_name}
            </span>
            {isTrusted && (
              <span
                title="Mitra Terpercaya: banyak pesanan selesai & rating tinggi"
                className="flex-shrink-0 inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold text-brand-success bg-brand-success/10 px-1 py-0.5 rounded"
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                Terpercaya
              </span>
            )}
          </div>

          {/* Rating + Orders + City */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-3 h-3 fill-brand-warning text-brand-warning" />
              <span className="text-[12px] sm:text-[13px] font-medium text-brand-gray-900">
                {service.partner_avg_rating?.toFixed(1) || '0.0'}
              </span>
            </div>
            {orderCount > 0 && (
              <span className="text-[11px] sm:text-[12px] text-brand-gray-400 truncate">
                · {formatOrderCount(orderCount)} pesanan
              </span>
            )}
            {service.partner_city && (
              <div className="flex items-center gap-0.5 text-brand-gray-700 min-w-0 ml-auto">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="text-[11px] sm:text-[12px] truncate">
                  {service.partner_city}
                </span>
              </div>
            )}
          </div>

          {/* Price - pushed to bottom */}
          <div className="mt-auto">
            <div className="flex items-baseline gap-0.5">
              <span className="text-[14px] sm:text-[16px] font-semibold text-brand-red">
                Rp {(service.price || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
