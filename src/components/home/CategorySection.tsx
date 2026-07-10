"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/types/category';

export default function CategorySection() {
  const { data: categories, isLoading, isError } = useCategories();

  // For MVP, just take the first 7 to leave room for the "Lainnya" button
  const displayCategories = categories?.slice(0, 7) || [];

  return (
    <section className="mb-6 sm:mb-10 md:mb-12">
      {isLoading ? (
        <div className="flex overflow-x-auto md:grid md:grid-cols-8 gap-4 sm:gap-6 md:gap-4 pb-4 md:pb-0 scrollbar-hide">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[72px] sm:w-[84px] md:w-auto flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-200 rounded-2xl animate-pulse" />
              <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-sm text-red-500">Gagal memuat kategori.</div>
      ) : (
        <div className="flex overflow-x-auto md:grid md:grid-cols-8 gap-4 sm:gap-6 md:gap-4 pb-4 md:pb-0 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {displayCategories.map((cat: Category) => (
            <Link
              key={cat.id}
              href={`/search?q=${cat.name}`}
              className="group flex-shrink-0 w-[72px] sm:w-[84px] md:w-auto flex flex-col items-center justify-start snap-start cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 mb-2 flex items-center justify-center bg-[#fcf9f8] border border-[#e5e2e1] rounded-2xl group-hover:border-[#b51822] group-hover:shadow-md transition-all relative overflow-hidden">
                <Image
                  src={cat.icon_url || '/icons/default.svg'}
                  alt={cat.name}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#1c1b1b] text-center leading-tight line-clamp-2 px-1">
                {cat.name}
              </span>
            </Link>
          ))}

          {/* Tombol Lihat Semua Kategori */}
          <Link
            href="/categories"
            className="group flex-shrink-0 w-[72px] sm:w-[84px] md:w-auto flex flex-col items-center justify-start snap-start cursor-pointer"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 mb-2 flex items-center justify-center bg-[#f0eded] border border-dashed border-[#e5e2e1] rounded-2xl group-hover:border-[#b51822] group-hover:bg-[#fcf9f8] transition-all">
              <span className="text-[#b51822] font-bold text-[24px]">+</span>
            </div>
            <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#b51822] text-center leading-tight px-1">
              Lainnya
            </span>
          </Link>
        </div>
      )}
    </section>
  );
}
