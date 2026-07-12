import Image from 'next/image';
import { useState } from 'react';
import { PartnerPortfolio } from '@/hooks/usePartnerProfile';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PortfolioGridProps {
  portfolios: PartnerPortfolio[];
  isLoading?: boolean;
}

export default function PortfolioGrid({ portfolios, isLoading }: PortfolioGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev === validPortfolios.length - 1 ? 0 : prev! + 1));
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev === 0 ? validPortfolios.length - 1 : prev! - 1));
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {validPortfolios.map((item, index) => (
          <div 
            key={item.id} 
            className="relative group rounded overflow-hidden aspect-square bg-gray-100 cursor-pointer"
            onClick={() => setSelectedIndex(index)}
          >
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

      {selectedIndex !== null && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" onClick={() => setSelectedIndex(null)}>
          <button onClick={() => setSelectedIndex(null)} className="absolute top-3 right-3 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white z-10">
            <X className="w-6 h-6" />
          </button>
          
          {validPortfolios.length > 1 && (
            <button onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white z-10">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          <div className="relative w-full h-full max-w-3xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <Image src={validPortfolios[selectedIndex].photo_url} alt={validPortfolios[selectedIndex].caption || 'Portfolio'} fill className="object-contain" sizes="100vw" />
          </div>
          
          {validPortfolios.length > 1 && (
            <button onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white z-10">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {validPortfolios.map((_, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); setSelectedIndex(idx); }}
                className={`w-2 h-2 rounded-full transition-all ${idx === selectedIndex ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full z-10">
            {selectedIndex + 1}/{validPortfolios.length}
          </div>
          
          {validPortfolios[selectedIndex].caption && (
             <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-sm text-center px-4 max-w-2xl bg-black/50 py-2 rounded-lg z-10">
               {validPortfolios[selectedIndex].caption}
             </div>
          )}
        </div>
      )}
    </>
  );
}
