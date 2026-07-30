"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useCategories, useSubcategories } from '@/hooks/useCategories';
import type { Category } from '@/types/category';

// Tautan kategori: pakai slug (SEO) bila ada, jika tidak fallback ke search.
function categoryHref(cat: Pick<Category, 'slug' | 'name'>) {
  return cat.slug ? `/kategori/${cat.slug}` : `/search?q=${encodeURIComponent(cat.name)}`;
}

export default function CategorySection() {
  const { data: categories, isLoading, isError } = useCategories();
  const [activeMain, setActiveMain] = useState<Category | null>(null);

  // For MVP, just take the first 7 to leave room for the "Lainnya" button
  const displayCategories = categories?.slice(0, 7) || [];

  return (
    <section className="mb-8 md:mb-12">
      {isLoading ? (
        <div className="flex overflow-x-auto md:grid md:grid-cols-8 gap-4 sm:gap-6 md:gap-4 pb-4 md:pb-0 scrollbar-hide">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[80px] sm:w-[88px] md:w-auto flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] bg-gray-200 rounded-2xl animate-pulse" />
              <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-sm text-red-500">Gagal memuat kategori.</div>
      ) : (
        <div className="flex overflow-x-auto md:grid md:grid-cols-8 gap-4 sm:gap-6 md:gap-4 pb-4 md:pb-0 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {displayCategories.map((cat: Category) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveMain(cat)}
              aria-haspopup="dialog"
              className="group flex-shrink-0 w-[80px] sm:w-[88px] md:w-auto flex flex-col items-center justify-start snap-start cursor-pointer"
            >
              <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] mb-2 flex items-center justify-center bg-[#fcf9f8] border border-[#e5e2e1] rounded-2xl group-hover:border-[#b51822] group-hover:shadow-md transition-all relative overflow-hidden">
                <Image
                  src={cat.icon_url || '/icons/default.svg'}
                  alt={cat.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 64px, 72px"
                />
              </div>
              <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#1c1b1b] text-center leading-tight line-clamp-2 px-1">
                {cat.name}
              </span>
            </button>
          ))}

          {/* Tombol Lihat Semua Kategori */}
          <Link
            href="/categories"
            className="group flex-shrink-0 w-[80px] sm:w-[88px] md:w-auto flex flex-col items-center justify-start snap-start cursor-pointer"
          >
            <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] mb-2 flex items-center justify-center bg-[#f0eded] border border-dashed border-[#e5e2e1] rounded-2xl group-hover:border-[#b51822] group-hover:bg-[#fcf9f8] transition-all">
              <span className="text-[#b51822] font-bold text-[24px]">+</span>
            </div>
            <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#b51822] text-center leading-tight px-1">
              Lainnya
            </span>
          </Link>
        </div>
      )}

      {activeMain && (
        <SubcategoryDrawer main={activeMain} onClose={() => setActiveMain(null)} />
      )}
    </section>
  );
}

function SubcategoryDrawer({ main, onClose }: { main: Category; onClose: () => void }) {
  const { data: subs, isLoading } = useSubcategories(main.id);

  return (
    <Modal
      open
      onClose={onClose}
      maxWidthClass="max-w-md"
      padded={false}
      header={
        <div className="flex items-center justify-between border-b border-[#e5e2e1] px-5 pt-1 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[#e5e2e1] bg-[#fcf9f8]">
              <Image src={main.icon_url || '/icons/default.svg'} alt={main.name} fill className="object-cover" sizes="36px" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[16px] font-bold text-[#1c1b1b]">{main.name}</h3>
              <p className="text-[12px] text-[#8f6f6d]">Pilih subkategori</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f3f2] text-[#5b403e] transition-colors hover:bg-[#e5e2e1]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="p-4">
        {/* Lihat semua di kategori utama */}
        <Link
          href={categoryHref(main)}
          onClick={onClose}
          className="mb-3 flex items-center justify-between rounded-xl border border-[#b51822]/30 bg-[#b51822]/5 p-3 text-[13px] font-semibold text-[#b51822] transition-colors hover:bg-[#b51822]/10"
        >
          <span>Lihat semua di {main.name}</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-14 w-14 animate-pulse rounded-2xl bg-gray-200" />
                <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : !subs || subs.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#8f6f6d]">
            Belum ada subkategori. Lihat semua layanan di {main.name} di atas.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {subs.map((sub) => (
              <Link
                key={sub.id}
                href={categoryHref(sub)}
                onClick={onClose}
                className="group flex flex-col items-center gap-2 p-1"
              >
                <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[#e5e2e1] bg-[#fcf9f8] transition-all group-hover:border-[#b51822] group-hover:shadow-md">
                  <Image src={sub.icon_url || '/icons/default.svg'} alt={sub.name} fill className="object-cover" sizes="56px" />
                </div>
                <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-[#1c1b1b]">
                  {sub.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
