import { getInitial } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, ShieldCheck } from 'lucide-react';
import type { PublicService } from '@/hooks/usePublicServices';
import { PLACEHOLDER_SERVICE } from '@/lib/images';
import { formatDistanceMeters } from '@/lib/distance';

// Kartu satu produk jasa (dipakai di Home "Produk & Layanan" dan hasil pencarian).
// Menautkan ke detail jasa /services?id=...
export function ServiceProductCard({ service }: { service: PublicService }) {
  const distance = formatDistanceMeters(service.distance_meters);
  return (
    <Link href={`/services?id=${service.id}&distance=${service.distance_meters || 0}`} className="block">
      <div className="bg-white border border-[#e5e2e1] rounded-xs overflow-hidden hover:shadow-md transition-all h-full flex flex-col">
        {/* Image */}
        <div className="relative w-full aspect-square bg-[#e5e2e1] flex-shrink-0">
          <Image
            src={service.photo_url || PLACEHOLDER_SERVICE}
            alt={service.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          />
          {/* Distance Badge - top right */}
          {distance && (
            <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              <span className="text-[10px] sm:text-[11px] font-medium leading-none">{distance}</span>
            </div>
          )}
          {/* Availability badge - top left */}
          {service.partner_is_online && (
            <div className="absolute top-1.5 left-1.5 bg-[#38A169]/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold leading-none">
              Tersedia Hari Ini
            </div>
          )}
          {/* Verified badge - bottom left (only if no availability badge overlaps) */}
          {service.partner_is_verified && !service.partner_is_online && (
            <div className="absolute top-1.5 left-1.5 bg-[#3182CE]/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span className="text-[9px] sm:text-[10px] font-semibold leading-none">Terverifikasi</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2 sm:p-3 flex flex-col flex-1">
          {/* Service Name */}
          <h3 className="text-[13px] sm:text-[14px] font-semibold text-[#1c1b1b] line-clamp-2 mb-1">
            {service.name}
          </h3>

          {/* Vendor */}
          <div className="flex items-center gap-1 mb-2">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#e5e2e1] overflow-hidden flex-shrink-0">
              {service.partner_avatar_url ? (
                <Image
                  src={service.partner_avatar_url}
                  alt={service.partner_name}
                  width={20}
                  height={20}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] sm:text-[10px] font-medium text-[#5b403e]">
                  {getInitial(service.partner_name || '')}
                </div>
              )}
            </div>
            <span className="text-[11px] sm:text-[12px] text-[#5b403e] truncate">
              {service.partner_name}
            </span>
          </div>

          {/* Rating + City */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-3 h-3 fill-[#D69E2E] text-[#D69E2E]" />
              <span className="text-[12px] sm:text-[13px] font-medium text-[#1c1b1b]">
                {service.partner_avg_rating?.toFixed(1) || '0.0'}
              </span>
            </div>
            {service.partner_city && (
              <div className="flex items-center gap-0.5 text-[#5b403e] min-w-0">
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
              <span className="text-[14px] sm:text-[16px] font-semibold text-[#b51822]">
                Rp {(service.price || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
