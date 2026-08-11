import { ArrowDown, ArrowUp, SlidersHorizontal } from 'lucide-react';

interface SortBarProps {
  onOpenFilter?: () => void;
  sort: string;
  onSortChange: (sort: string) => void;
  /** Arah urut . hanya bermakna untuk 'harga'. */
  sortDir?: 'asc' | 'desc';
  onSortDirChange?: (dir: 'asc' | 'desc') => void;
  /**
   * Jumlah filter yang sedang aktif. Ditampilkan sebagai badge pada tombol
   * Filter versi mobile . satu-satunya yang terlihat saat panel tertutup.
   * Tanpa ini, pengguna yang memfilter ke satu kota lalu menutup panel tidak
   * punya petunjuk apa pun kenapa hasilnya sedikit (audit E5).
   */
  activeFilterCount?: number;
}

export default function SortBar({
  onOpenFilter,
  sort,
  onSortChange,
  sortDir = 'asc',
  onSortDirChange,
  activeFilterCount = 0,
}: SortBarProps) {
  const getButtonClass = (value: string) => {
    const isActive = sort === value;
    return isActive
      ? "bg-brand-red text-white text-[12px] md:text-[14px] font-medium py-1 px-2.5 md:py-[6px] md:px-[16px] rounded-md whitespace-nowrap transition-colors"
      : "bg-white border border-brand-gray-100 text-brand-gray-900 text-[12px] md:text-[14px] py-1 px-2.5 md:py-[7px] md:px-[17px] rounded-md hover:border-brand-red whitespace-nowrap transition-all";
  };

  // Menekan "Harga" saat ia sudah aktif MEMBALIK arahnya. Chevron lama hanya
  // dekorasi . ia menyiratkan arah bisa dibalik padahal menekannya berulang
  // tidak mengubah apa pun.
  const handleHarga = () => {
    if (sort === 'harga') {
      onSortDirChange?.(sortDir === 'asc' ? 'desc' : 'asc');
      return;
    }
    onSortChange('harga');
    onSortDirChange?.('asc');
  };

  const DirIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className="flex items-center gap-1.5 md:gap-4 bg-brand-gray-60 border border-brand-gray-100 rounded-lg p-1.5 md:p-[9px] w-full overflow-x-auto scrollbar-hide">

      {/* Mobile Filter Button */}
      <button
        onClick={onOpenFilter}
        aria-label={`Filter${activeFilterCount > 0 ? ` (${activeFilterCount} aktif)` : ''}`}
        className="md:hidden relative flex items-center gap-1 bg-white border border-brand-gray-100 text-brand-gray-900 text-[12px] md:text-[14px] font-medium py-1 px-2 md:py-[7px] md:px-3 rounded-md whitespace-nowrap transition-all shadow-sm"
      >
        <SlidersHorizontal className="w-3 h-3 md:w-4 md:h-4" />
        Filter
        {activeFilterCount > 0 && (
          <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-brand-red text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* "Urutkan:", bukan "Sort by:" . satu-satunya label Inggris di UI yang
          sepenuhnya berbahasa Indonesia (audit C8). */}
      <span className="hidden md:inline text-[14px] font-medium text-brand-gray-700 whitespace-nowrap">
        Urutkan:
      </span>
      <div className="flex items-center gap-1.5 md:gap-2">
        <button onClick={() => onSortChange('terpopuler')} className={getButtonClass('terpopuler')} aria-pressed={sort === 'terpopuler'}>
          Terpopuler
        </button>
        <button onClick={() => onSortChange('terbaru')} className={getButtonClass('terbaru')} aria-pressed={sort === 'terbaru'}>
          Terbaru
        </button>
        <button onClick={() => onSortChange('terlaris')} className={getButtonClass('terlaris')} aria-pressed={sort === 'terlaris'}>
          Terlaris
        </button>
        <button
          onClick={handleHarga}
          aria-pressed={sort === 'harga'}
          aria-label={
            sort === 'harga'
              ? `Harga, ${sortDir === 'asc' ? 'termurah dulu' : 'termahal dulu'} . tekan untuk membalik`
              : 'Urutkan berdasarkan harga'
          }
          className={getButtonClass('harga') + ' inline-flex items-center gap-1'}
        >
          Harga
          {sort === 'harga' && <DirIcon className="w-3 h-3 md:w-3.5 md:h-3.5" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
