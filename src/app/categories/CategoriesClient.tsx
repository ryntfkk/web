"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ChevronRight } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories, useSubcategories } from '@/hooks/useCategories';
import type { Category } from '@/types/category';

function categoryHref(cat: Pick<Category, 'slug' | 'name'>) {
  return cat.slug ? `/kategori/${cat.slug}` : `/search?q=${encodeURIComponent(cat.name)}`;
}

export default function CategoriesClient() {
  const { data: categories, isLoading, isError } = useCategories();

  return (
    <div className="min-h-screen bg-brand-gray-60 flex flex-col">
      {/* titleAs="p": H1 halaman ada di badan konten (baris di bawah). */}
      <MobilePageHeader title="Semua Kategori" titleAs="p" backHref="/" maxWidthClass="max-w-6xl" />
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 md:p-8">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-8">Semua Kategori</h1>

        {isLoading ? (
          <div className="space-y-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <section key={i}>
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div key={j} className="flex flex-col items-center gap-2">
                      <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl" />
                      <Skeleton className="w-12 h-3" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center text-red-500 py-10">Gagal memuat kategori.</div>
        ) : categories?.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Belum ada kategori tersedia.</div>
        ) : (
          <div className="space-y-8">
            {categories?.map((main) => (
              <MainCategoryBlock key={main.id} main={main} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MainCategoryBlock({ main }: { main: Category }) {
  const { data: subs, isLoading } = useSubcategories(main.id);

  return (
    <section>
      {/* Header kategori utama */}
      <Link
        href={categoryHref(main)}
        className="group flex items-center gap-3 mb-4"
      >
        <div className="w-11 h-11 relative rounded-xl overflow-hidden bg-brand-gray-50 border border-brand-gray-100 shrink-0">
          <Image src={main.icon_url || '/icons/default.svg'} alt={main.name} fill className="object-cover" />
        </div>
        <h2 className="text-[16px] sm:text-[18px] font-bold text-brand-gray-900 group-hover:text-brand-red transition-colors">
          {main.name}
        </h2>
        <ChevronRight className="w-4 h-4 text-brand-gray-400 group-hover:text-brand-red transition-colors" />
      </Link>

      {/* Subkategori */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-2xl animate-pulse" />
              <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : !subs || subs.length === 0 ? (
        <p className="text-[13px] text-brand-gray-400 pl-1">Belum ada subkategori.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6">
          {subs.map((sub) => (
            <Link
              key={sub.id}
              href={categoryHref(sub)}
              className="group flex flex-col items-center justify-start cursor-pointer"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 flex items-center justify-center bg-brand-gray-50 border border-brand-gray-100 rounded-2xl group-hover:border-brand-red group-hover:shadow-md transition-all relative overflow-hidden">
                <Image src={sub.icon_url || '/icons/default.svg'} alt={sub.name} fill className="object-cover" />
              </div>
              <span className="text-[12px] sm:text-[14px] font-medium text-brand-gray-900 text-center leading-tight line-clamp-2 px-1 group-hover:text-brand-red transition-colors">
                {sub.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
