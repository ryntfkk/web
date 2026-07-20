import { getInitial } from '@/lib/utils';
import Image from 'next/image';
import { Star, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Ringkas jumlah pesanan: 1.200 → "1,2rb+", 15 → "15". */
function formatOrderCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k.toFixed(k >= 10 || Number.isInteger(k) ? 0 : 1).replace('.', ',')}rb+`;
  }
  return `${n}`;
}

interface ServiceCardProps {
  vendorName: string;
  category: string;
  rating: number;
  reviewCount: number;
  price: number;
  unit: string;
  imageUrl: string;
  isPro?: boolean;
  /** Kota basecamp mitra (selalu tampil bila ada). */
  city?: string;
  /** Jarak terformat (mis. "2.3 km"); tampil bila lokasi user tersedia. */
  distance?: string;
  /** Total pesanan selesai (mitra/layanan). Tampil sebagai social proof bila > 0. */
  orderCount?: number;
  vendorAvatar?: string;
  className?: string;
}

export function ServiceCard({
  vendorName,
  category,
  rating,
  reviewCount,
  price,
  unit,
  imageUrl,
  isPro = false,
  city,
  distance,
  orderCount,
  vendorAvatar,
  className,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-white border border-[#e5e2e1] rounded-xs overflow-hidden cursor-pointer hover:shadow-md transition-all",
        className
      )}
    >
      {/* Image Section - Square 1:1 ratio */}
      <div className="relative w-full aspect-square bg-[#e5e2e1]">
        <Image
          src={imageUrl}
          alt={vendorName}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
        />
        {/* PRO Badge - top left */}
        {isPro && (
          <div className="absolute top-2 left-2 bg-[#b51822] text-white px-2 py-0.5 rounded-md">
            <span className="text-[12px] sm:text-[14px] font-semibold leading-none">PRO</span>
          </div>
        )}
        {/* Distance Badge - top right */}
        {distance && (
          <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <MapPin className="w-2.5 h-2.5" />
            <span className="text-[10px] sm:text-[11px] font-medium leading-none">{distance}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-2 sm:p-3 flex flex-col gap-0.5 sm:gap-1">
        {/* Service Title */}
        <h3 className="text-[13px] sm:text-[14px] font-semibold text-[#1c1b1b] leading-tight line-clamp-2">
          {vendorName}
        </h3>

        {/* Vendor Row - Avatar + Category */}
        <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg sm:rounded-xl bg-[#e5e2e1] flex items-center justify-center overflow-hidden flex-shrink-0">
            {vendorAvatar ? (
              <Image
                src={vendorAvatar}
                alt={vendorName}
                width={20}
                height={20}
                className="object-cover"
              />
            ) : (
              <span className="text-[8px] sm:text-[10px] font-medium text-[#5b403e]">
                {getInitial(vendorName)}
              </span>
            )}
          </div>
          <span className="text-[11px] sm:text-[12px] font-normal text-[#5b403e] truncate">
            {category}
          </span>
        </div>

        {/* Rating + Orders + City Row */}
        <div className="flex items-center justify-between gap-1 mt-0.5 sm:mt-1">
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 min-w-0">
            <Star className="w-3 h-3 fill-[#D69E2E] text-[#D69E2E] flex-shrink-0" />
            <span className="text-[12px] font-medium text-[#1c1b1b]">{Number(rating).toFixed(1)}</span>
            {typeof orderCount === 'number' && orderCount > 0 && (
              <span className="text-[10px] sm:text-[11px] text-[#8f6f6d] truncate">
                · {formatOrderCount(orderCount)} pesanan
              </span>
            )}
          </div>
          {city && (
            <div className="flex items-center gap-0.5 text-[#5b403e] min-w-0">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
              <span className="text-[11px] sm:text-[12px] font-normal truncate">{city}</span>
            </div>
          )}
        </div>

        {/* Price Row */}
        <div className="flex items-end gap-0.5 sm:gap-1 mt-1 sm:mt-2">
          <span className="text-[14px] sm:text-[16px] font-semibold text-[#b51822] leading-none">
            Rp {price.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] sm:text-[12px] font-normal text-[#5b403e] mb-0.5">
            /{unit}
          </span>
        </div>
      </div>
    </div>
  );
}
