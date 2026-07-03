import Image from 'next/image';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ServiceCardProps {
  vendorName: string;
  category: string;
  rating: number;
  reviewCount: number;
  price: number;
  unit: string;
  imageUrl: string;
  isPro?: boolean;
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
}: ServiceCardProps) {
  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
      <div className="relative aspect-video w-full bg-brand-gray-100">
        <Image
          src={imageUrl}
          alt={vendorName}
          fill
          className="object-cover"
        />
        {isPro && (
          <div className="absolute top-2 left-2 bg-brand-gray-900 text-white px-2 py-0.5 rounded-sm">
            <span className="text-[14px] font-semibold">PRO</span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[11px] font-medium uppercase text-brand-gray-700 tracking-wide">
            {category}
          </span>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-brand-orange text-brand-orange" />
            <span className="text-sm font-medium text-brand-gray-900">{rating}</span>
            <span className="text-xs text-brand-gray-400">({reviewCount})</span>
          </div>
        </div>
        
        <h3 className="text-sm font-regular text-brand-gray-700 mb-2 truncate">
          {vendorName}
        </h3>
        
        <div className="flex items-end gap-1">
          <span className="text-[20px] font-semibold text-brand-red">
            Rp {price.toLocaleString('id-ID')}
          </span>
          <span className="text-sm text-brand-gray-700 mb-0.5">
            /{unit}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
