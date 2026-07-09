import Image from 'next/image';
import { PartnerPortfolio } from '@/hooks/usePartnerProfile';

interface PortfolioGridProps {
  portfolios: PartnerPortfolio[];
  isLoading?: boolean;
}

export default function PortfolioGrid({ portfolios, isLoading }: PortfolioGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  // Filter out invalid portfolio entries
  const validPortfolios = Array.isArray(portfolios)
    ? portfolios.filter(p => p && typeof p.id === 'string' && typeof p.photo_url === 'string')
    : [];

  if (validPortfolios.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Belum ada foto portofolio.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
      {validPortfolios.map((item) => (
        <div key={item.id} className="relative group rounded overflow-hidden aspect-square bg-gray-100 cursor-pointer">
          <Image
            src={item.photo_url}
            alt={typeof item.caption === 'string' ? item.caption : 'Portofolio'}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
          {item.caption && typeof item.caption === 'string' && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
              <span className="text-white text-xs sm:text-sm font-medium line-clamp-2">
                {item.caption}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
