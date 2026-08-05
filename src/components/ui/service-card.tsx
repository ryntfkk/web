import { getInitial } from '@/lib/utils';
import Image from 'next/image';
import { Star, MapPin, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/ui/price';
import { formatCompactNumber } from '@/lib/format';

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
  /**
   * Layanan menuntut sesuatu yang WAJIB disiapkan pelanggan (C3). Hanya penanda;
   * daftarnya di halaman detail. Ditampilkan di kartu supaya pelanggan tahu
   * sebelum masuk . persyaratan yang baru terlihat di kaki halaman detail sudah
   * terlambat untuk memengaruhi pilihannya.
   */
  hasMandatoryRequirements?: boolean;
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
  hasMandatoryRequirements = false,
  vendorAvatar,
  className,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-white border border-brand-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all",
        className
      )}
    >
      {/* Image Section - Square 1:1 ratio */}
      <div className="relative w-full aspect-square bg-brand-gray-100">
        <Image
          src={imageUrl}
          alt={vendorName}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
        />
        {/* PRO Badge - top left */}
        {isPro && (
          <Badge variant="pro" className="absolute top-2 left-2">
            PRO
          </Badge>
        )}
        {/* Distance Badge - top right */}
        {distance && (
          <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-sm text-brand-gray-900 px-1.5 py-1 sm:px-2 rounded border border-brand-gray-100 shadow-sm flex items-center gap-0.5 sm:gap-1">
            <MapPin className="w-3 h-3 text-brand-red shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-bold leading-none">{distance}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-2 sm:p-3 flex flex-col gap-0.5 sm:gap-1">
        {/* Service Title */}
        <h3 className="text-[13px] sm:text-[14px] font-semibold text-brand-gray-900 leading-tight line-clamp-2">
          {vendorName}
        </h3>

        {/* Vendor Row - Avatar + Category */}
        <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg sm:rounded-xl bg-brand-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {vendorAvatar ? (
              <Image
                src={vendorAvatar}
                alt={vendorName}
                width={20}
                height={20}
                className="object-cover"
              />
            ) : (
              <span className="text-[8px] sm:text-[10px] font-medium text-brand-gray-700">
                {getInitial(vendorName)}
              </span>
            )}
          </div>
          <span className="text-[11px] sm:text-[12px] font-normal text-brand-gray-700 truncate">
            {category}
          </span>
        </div>

        {hasMandatoryRequirements && (
          <div className="mt-0.5 flex items-center gap-1 text-brand-warning-dark">
            <ClipboardCheck className="w-3 h-3 flex-shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-medium truncate">Ada yang perlu disiapkan</span>
          </div>
        )}

        {/* Rating + Orders + City Row */}
        <div className="flex items-center justify-between gap-1 mt-0.5 sm:mt-1">
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 min-w-0">
            <Star className="w-3 h-3 fill-brand-warning text-brand-warning flex-shrink-0" />
            <span className="text-[12px] font-medium text-brand-gray-900">{Number(rating).toFixed(1)}</span>
            {typeof orderCount === 'number' && orderCount > 0 && (
              <span className="text-[10px] sm:text-[11px] text-brand-gray-400 truncate">
                · {formatCompactNumber(orderCount)} pesanan
              </span>
            )}
          </div>
          {city && (
            <div className="flex items-center gap-0.5 text-brand-gray-700 min-w-0">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
              <span className="text-[11px] sm:text-[12px] font-normal truncate">{city}</span>
            </div>
          )}
        </div>

        {/* Price Row */}
        <div className="flex items-end gap-0.5 sm:gap-1 mt-1 sm:mt-2">
          <Price price={price} size="sm" className="text-[14px] sm:text-[16px] font-semibold leading-none" />
          <span className="text-[11px] sm:text-[12px] font-normal text-brand-gray-700 mb-0.5">
            /{unit}
          </span>
        </div>
      </div>
    </div>
  );
}
