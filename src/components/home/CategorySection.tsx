import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CATEGORIES } from '@/lib/data';

export default function CategorySection() {
  return (
    <section className="mb-6 sm:mb-10 md:mb-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        {/* H2: Responsive font size */}
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
          Kategori
        </h2>
        <Button variant="ghost" className="text-[12px] sm:text-[14px] h-auto py-1">
          Lihat Semua
        </Button>
      </div>
      {/* Grid: 4 columns on mobile, 8 on desktop */}
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
        {CATEGORIES.map((cat, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-[#fcf9f8] border border-[#e5e2e1] rounded-[4px] cursor-pointer hover:border-[#b51822] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all"
          >
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 mb-1 sm:mb-2">
              <Image src={cat.icon} alt={cat.name} fill className="object-contain" />
            </div>
            <span className="text-[10px] sm:text-[12px] md:text-[14px] font-medium text-[#1c1b1b] text-center leading-tight">
              {cat.name}
            </span>
          </div>
        ))}
        
        {/* Tombol Lihat Semua Kategori */}
        <Link href="/categories" className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-white border border-dashed border-[#e5e2e1] rounded-[4px] cursor-pointer hover:border-[#b51822] transition-all">
          <div className="w-8 h-8 sm:w-10 sm:h-10 mb-1 sm:mb-2 flex items-center justify-center bg-[#f0eded] rounded-full">
            <span className="text-[#b51822] font-bold text-[20px]">+</span>
          </div>
          <span className="text-[10px] sm:text-[12px] md:text-[14px] font-medium text-[#b51822] text-center leading-tight">
            Lainnya
          </span>
        </Link>
      </div>
    </section>
  );
}
