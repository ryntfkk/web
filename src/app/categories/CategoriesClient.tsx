"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
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
      <MobilePageHeader title="Semua Kategori" titleAs="p" backHref="/" maxWidthClass="max-w-6xl" gutterClass="px-4 sm:px-6 md:px-8" />
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 md:p-8">
        <h1 className="text-xl lg:text-2xl font-bold text-brand-gray-900 mb-2">Semua Kategori</h1>
        {/* Legenda indikator ketersediaan mitra (titik pada subkategori). */}
        <p className="text-[13px] text-brand-gray-450 mb-8 inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-success inline-block shrink-0" aria-hidden="true" />
          Titik hijau menandai subkategori yang sudah ada mitranya.
        </p>

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
          <div className="text-center text-brand-error py-10">Gagal memuat kategori.</div>
        ) : categories?.length === 0 ? (
          <div className="text-center text-brand-gray-450 py-10">Belum ada kategori tersedia.</div>
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
  // Default TERTUTUP: semua kategori utama harus terlihat sekilas tanpa dibanjiri
  // subkategori. Subkategori baru diambil saat dibuka (hook enabled bila id ada).
  const [expanded, setExpanded] = React.useState(false);
  const { data: subs, isLoading } = useSubcategories(expanded ? main.id : null);

  return (
    <section>
      {/* Header kategori utama. Nama+ikon menuju halaman kategori; tombol chevron
          memunculkan/menyembunyikan subkategori (terpisah dari tautan kategori). */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={categoryHref(main)} className="group flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 relative rounded-xl overflow-hidden bg-brand-gray-50 border border-brand-gray-100 shrink-0">
            <Image src={main.icon_url || '/icons/default.svg'} alt={main.name} fill className="object-cover" />
          </div>
          <h2 className="text-[16px] sm:text-[18px] font-bold text-brand-gray-900 group-hover:text-brand-red transition-colors truncate">
            {main.name}
          </h2>
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-full border border-brand-gray-100 bg-white px-3 py-1.5 text-[12px] font-medium text-brand-gray-700 hover:border-brand-red hover:text-brand-red transition-colors"
        >
          {expanded ? 'Sembunyikan' : 'Lihat subkategori'}
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Subkategori . teks/chip saja, bukan ikon. Ikon hanya untuk kategori
          utama agar hierarki visual jelas dan halaman tidak berisik. Titik pada
          chip = indikator ketersediaan mitra (has_services dari backend). */}
      {expanded && (
        isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        ) : !subs || subs.length === 0 ? (
          <p className="text-[13px] text-brand-gray-400 pl-1">Belum ada subkategori.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subs.map((sub) => {
              // boolean dari backend; undefined = respons lama (belum deploy) →
              // jangan tampilkan indikator agar tidak menyesatkan.
              const hasMitra = sub.has_services;
              return (
                <Link
                  key={sub.id}
                  href={categoryHref(sub)}
                  title={hasMitra === false ? 'Belum ada mitra' : hasMitra === true ? 'Sudah ada mitra' : undefined}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[13px] font-medium transition-colors ${
                    hasMitra === false
                      ? 'border-brand-gray-100 bg-white text-brand-gray-400 hover:border-brand-gray-300'
                      : 'border-brand-gray-100 bg-white text-brand-gray-900 hover:border-brand-red hover:text-brand-red'
                  }`}
                >
                  {hasMitra !== undefined && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasMitra ? 'bg-brand-success' : 'bg-brand-gray-300'}`}
                      aria-hidden="true"
                    />
                  )}
                  {sub.name}
                </Link>
              );
            })}
          </div>
        )
      )}
    </section>
  );
}
