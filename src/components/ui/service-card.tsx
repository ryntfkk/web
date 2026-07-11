import Image from 'next/image';
import { Star, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  vendorName: string;
  category: string;
  rating: number;
  reviewCount: number;
  price: number;
  unit: string;
  imageUrl: string;
  isPro?: boolean;
  location?: string;
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
  location,
  vendorAvatar,
  className,
}: ServiceCardProps) {
  // Only show the location row when real coordinates were used (not a fallback).
  const showLocation = location && location !== '0.0 km' && !location.startsWith('0.0');
  return (
    <div
      className={cn(
        "flex flex-col bg-white border border-[#e5e2e1] rounded-[4px] overflow-hidden cursor-pointer hover:shadow-md transition-all",
        className
      )}
    >
      {/* Image Section - Square 1:1 ratio (Shopee style) */}
      <div className="relative w-full aspect-square bg-[#e5e2e1]">
        <Image
          src={imageUrl}
          alt={vendorName}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
        />
        {/* PRO Badge - positioned 8px from edges */}
        {isPro && (
          <div className="absolute top-2 left-2 bg-[#b51822] text-white px-2 py-0.5 rounded-md">
            <span className="text-[12px] sm:text-[14px] font-semibold leading-none">PRO</span>
          </div>
        )}
      </div>

      {/* Content Section - Responsive padding */}
      <div className="p-2 sm:p-3 flex flex-col gap-0.5 sm:gap-1">
        {/* Service Title - Responsive font size */}
        <h3 className="text-[13px] sm:text-[14px] font-semibold text-[#1c1b1b] leading-tight line-clamp-2">
          {vendorName}
        </h3>

        {/* Vendor Row - Avatar + Name */}
        <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-[10px] sm:rounded-[12px] bg-[#e5e2e1] flex items-center justify-center overflow-hidden flex-shrink-0">
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
                {vendorName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-[11px] sm:text-[12px] font-normal text-[#5b403e] truncate">
            {category}
          </span>
        </div>

        {/* Rating + Location Row */}
        <div className="flex items-center justify-between mt-0.5 sm:mt-1">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Gold filled star */}
            <Star className="w-3 h-3 fill-[#D69E2E] text-[#D69E2E]" />
            <span className="text-[12px] font-medium text-[#1c1b1b]">{Number(rating).toFixed(1)}</span>
            <span className="text-[11px] sm:text-[12px] font-normal text-[#5b403e] hidden sm:inline">({reviewCount})</span>
          </div>
          {showLocation && (
            <div className="flex items-center gap-0.5 text-[#5b403e]">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="text-[11px] sm:text-[12px] font-normal">{location}</span>
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
