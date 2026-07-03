import Image from 'next/image';
import { PartnerPortfolio } from '@/hooks/usePartnerProfile';

interface PortfolioGridProps {
  portfolios: PartnerPortfolio[];
}

export default function PortfolioGrid({ portfolios }: PortfolioGridProps) {
  if (!portfolios || portfolios.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Portofolio & Hasil Kerja</h2>
        <div className="text-center py-8 text-gray-500">
          Belum ada foto portofolio.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Portofolio & Hasil Kerja</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {portfolios.map((item) => (
          <div key={item.id} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100 cursor-pointer">
            <Image
              src={item.photo_url}
              alt={item.caption || 'Portofolio'}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
              <span className="text-white text-xs sm:text-sm font-medium line-clamp-2">
                {item.caption}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
