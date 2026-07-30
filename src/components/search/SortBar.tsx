import { ChevronDown, SlidersHorizontal } from 'lucide-react';

interface SortBarProps {
  onOpenFilter?: () => void;
  sort: string;
  onSortChange: (sort: string) => void;
}

export default function SortBar({ onOpenFilter, sort, onSortChange }: SortBarProps) {
  const getButtonClass = (value: string) => {
    const isActive = sort === value;
    return isActive
      ? "bg-brand-red text-white text-[12px] md:text-[14px] font-medium py-1 px-2.5 md:py-[6px] md:px-[16px] rounded-md whitespace-nowrap transition-colors"
      : "bg-white border border-brand-gray-100 text-brand-gray-900 text-[12px] md:text-[14px] py-1 px-2.5 md:py-[7px] md:px-[17px] rounded-md hover:border-brand-red whitespace-nowrap transition-all";
  };
  return (
    <div className="flex items-center gap-1.5 md:gap-4 bg-brand-gray-60 border border-brand-gray-100 rounded-lg p-1.5 md:p-[9px] w-full overflow-x-auto scrollbar-hide">

      {/* Mobile Filter Button */}
      <button
        onClick={onOpenFilter}
        className="md:hidden flex items-center gap-1 bg-white border border-brand-gray-100 text-brand-gray-900 text-[12px] md:text-[14px] font-medium py-1 px-2 md:py-[7px] md:px-3 rounded-md whitespace-nowrap transition-all shadow-sm"
      >
        <SlidersHorizontal className="w-3 h-3 md:w-4 md:h-4" />
        Filter
      </button>

      <span className="hidden md:inline text-[14px] font-medium text-brand-gray-700 whitespace-nowrap">
        Sort by:
      </span>
      <div className="flex items-center gap-1.5 md:gap-2">
        <button onClick={() => onSortChange('terpopuler')} className={getButtonClass('terpopuler')}>
          Terpopuler
        </button>
        <button onClick={() => onSortChange('terbaru')} className={getButtonClass('terbaru')}>
          Terbaru
        </button>
        <button onClick={() => onSortChange('terlaris')} className={getButtonClass('terlaris')}>
          Terlaris
        </button>
        <button onClick={() => onSortChange('harga')} className={getButtonClass('harga') + " flex items-center relative pl-2.5 pr-[22px] md:pl-[17px] md:pr-[33px]"}>
          Harga
          <ChevronDown className="w-3 h-3 md:w-[12px] md:h-[12px] absolute right-[6px] md:right-[10px]" />
        </button>
      </div>
    </div>
  );
}
