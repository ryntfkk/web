'use client';

import { getInitial } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, ShieldCheck } from 'lucide-react';
import type { PublicService } from '@/hooks/usePublicServices';
import { PLACEHOLDER_SERVICE } from '@/lib/images';
import { formatDistanceMeters } from '@/lib/distance';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/ui/price';
import { formatCompactNumber } from '@/lib/format';

// Ambang badge "Terpercaya" (gaya Star Seller / Power Merchant): performa nyata
// (banyak pesanan selesai + rating tinggi), bukan sekadar terdaftar . jadi badge
// tampil selektif, bukan di semua kartu. Tunable.
const TRUSTED_MIN_ORDERS = 20;
const TRUSTED_MIN_RATING = 4.7;

// Kartu satu produk jasa (dipakai di Home "Produk & Layanan" dan hasil pencarian).
// Menautkan ke detail jasa /services/<id> (route SSR).
export function ServiceProductCard({ service }: { service: PublicService }) {
  const distance = formatDistanceMeters(service.distance_meters);
  const orderCount = service.total_orders ?? 0;
  const isTrusted =
    orderCount >= TRUSTED_MIN_ORDERS && (service.partner_avg_rating ?? 0) >= TRUSTED_MIN_RATING;

  // SE: alt text dinamis untuk Google Image Search . sertakan keyword
  // "jasa [kategori] di [kota]" agar gambar muncul di pencarian gambar
  // berdasarkan intent lokasi (mis. "jasa ac semarang").
  const imageAlt = [
    service.category_name && `Jasa ${service.category_name}`,
    service.partner_city && `di ${service.partner_city}`,
    service.name,
    service.partner_name && `oleh ${service.partner_name}`,
  ].filter(Boolean).join(' - ');

  return (
    <Link href={`/services/${service.id}?distance=${service.distance_meters || 0}`} className="block">
      <div className="bg-white border border-brand-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-all h-full flex flex-col">
        {/* Image */}
        <div className="relative w-full aspect-square bg-brand-gray-100 flex-shrink-0">
          <Image
            src={service.photo_url || PLACEHOLDER_SERVICE}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          />

          {/* Distance Badge - bottom right */}
          {distance && (
            <div className="absolute bottom-1.5 right-1.5 bg-white/95 backdrop-blur-sm text-brand-gray-900 px-1.5 py-1 sm:px-2 rounded border border-brand-gray-100 shadow-sm flex items-center gap-0.5 sm:gap-1">
              <MapPin className="w-3 h-3 text-brand-red shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold leading-none">{distance}</span>
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
              <Badge
                variant="verified"
                title="Mitra Terpercaya: banyak pesanan selesai & rating tinggi"
                className="flex-shrink-0"
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                Terpercaya
              </Badge>
            )}
          </div>

          {/* Rating + City */}
          <div className="flex items-center gap-2 mb-2">
            {/* Mitra tanpa ulasan tampil "Baru", BUKAN "0.0" berbintang emas.
                Angka nol di sebelah bintang terbaca "dinilai sangat buruk",
                bukan "belum dinilai" . dan itu merugikan mitra baru persis di
                kartu hasil pencarian (audit E6). Pola yang benar sudah dipakai
                halaman detail pesanan. */}
            {(service.partner_avg_rating ?? 0) > 0 ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className="w-3 h-3 fill-brand-warning text-brand-warning" />
                <span className="text-[12px] sm:text-[13px] font-medium text-brand-gray-900">
                  {service.partner_avg_rating!.toFixed(1)}
                </span>
              </div>
            ) : (
              <span className="text-[11px] sm:text-[12px] font-medium text-brand-gray-450 flex-shrink-0">
                Mitra baru
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

          {/* Price + order count - pushed to bottom */}
          <div className="mt-auto flex items-baseline justify-between gap-2">
            <Price price={service.price || 0} size="sm" className="text-[14px] sm:text-[16px] font-semibold" />
            {orderCount > 0 && (
              <span className="text-[10px] sm:text-[11px] text-brand-gray-400 shrink-0">
                {formatCompactNumber(orderCount)} Selesai
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
