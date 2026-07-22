"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { useCategories } from '@/hooks/useCategories';

export default function CategoriesClient() {
  const { data: categories, isLoading, isError } = useCategories();

  return (
    <div className="min-h-screen bg-[#f7f5f4] flex flex-col">
      <MobilePageHeader title="Semua Kategori" backHref="/" maxWidthClass="max-w-6xl" />
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 md:p-8">
        <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b] mb-8">Semua Kategori</h1>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#b51822]" />
          </div>
        ) : isError ? (
          <div className="text-center text-red-500 py-10">Gagal memuat kategori.</div>
        ) : categories?.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Belum ada kategori tersedia.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6">
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                href={`/search?q=${encodeURIComponent(cat.name)}`}
                className="group flex flex-col items-center justify-start cursor-pointer"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 flex items-center justify-center bg-[#fcf9f8] border border-[#e5e2e1] rounded-2xl group-hover:border-[#b51822] group-hover:shadow-md transition-all relative overflow-hidden">
                  <Image
                    src={cat.icon_url || '/icons/default.svg'}
                    alt={cat.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-[12px] sm:text-[14px] font-medium text-[#1c1b1b] text-center leading-tight line-clamp-2 px-1 group-hover:text-[#b51822] transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
