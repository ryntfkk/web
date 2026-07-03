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
  location = "Jakarta",
  vendorAvatar,
  className,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-white border border-[#e5e2e1] rounded-[4px] overflow-hidden cursor-pointer hover:shadow-md transition-all",
        className
      )}
    >
      {/* Image Section - 204px height per spec */}
      <div className="relative w-full h-[204px] bg-[#e5e2e1]">
        <Image
          src={imageUrl}
          alt={vendorName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {/* PRO Badge - positioned 8px from edges */}
        {isPro && (
          <div className="absolute top-2 left-2 bg-[#b51822] text-white px-2 py-0.5 rounded-[2px]">
            <span className="text-[14px] font-semibold leading-none">PRO</span>
          </div>
        )}
      </div>

      {/* Content Section - 8px padding, 4px internal gap */}
      <div className="p-2 flex flex-col gap-1">
        {/* Service Title - 16sp SemiBold, max 2 lines */}
        <h3 className="text-[16px] font-semibold text-[#1c1b1b] leading-tight line-clamp-2">
          {vendorName}
        </h3>

        {/* Vendor Row - Avatar + Name */}
        <div className="flex items-center gap-1 mt-1">
          <div className="w-5 h-5 rounded-[12px] bg-[#e5e2e1] flex items-center justify-center overflow-hidden flex-shrink-0">
            {vendorAvatar ? (
              <Image
                src={vendorAvatar}
                alt={vendorName}
                width={20}
                height={20}
                className="object-cover"
              />
            ) : (
              <span className="text-[10px] font-medium text-[#5b403e]">
                {vendorName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-[12px] font-normal text-[#5b403e] truncate">
            {category}
          </span>
        </div>

        {/* Rating + Location Row */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            {/* Gold filled star */}
            <Star className="w-[11.67px] h-[11.08px] fill-[#D69E2E] text-[#D69E2E]" />
            <span className="text-[14px] font-medium text-[#1c1b1b]">{rating}</span>
            <span className="text-[14px] font-normal text-[#5b403e]">({reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-[#5b403e]">
            <MapPin className="w-3 h-3" />
            <span className="text-[14px] font-normal">{location}</span>
          </div>
        </div>

        {/* Price Row - 8px margin-top */}
        <div className="flex items-end gap-1 mt-2">
          <span className="text-[20px] font-semibold text-[#b51822] leading-none">
            Rp {price.toLocaleString('id-ID')}
          </span>
          <span className="text-[14px] font-normal text-[#5b403e] mb-0.5">
            /{unit}
          </span>
        </div>
      </div>
    </div>
  );
}
