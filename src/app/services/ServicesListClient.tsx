"use client";

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import ServiceListLayout from '@/components/services/ServiceListLayout';
import { useServiceListing } from '@/hooks/useServiceListing';
import type { PublicService } from '@/hooks/usePublicServices';
import type { Category } from '@/types/category';

// Filter kategori sengaja berupa <Link> (navigasi), bukan state klien: URL jadi
// bisa dibagikan & di-render server, sehingga tiap tampilan terfilter tetap
// punya HTML berisi konten. Filter kota/rating/sort & paginasi ditangani hook
// useServiceListing (client-side) via ServiceListLayout.
export default function ServicesListClient({
  initialServices,
  categories,
  activeCategory,
}: {
  initialServices: PublicService[];
  categories: Category[];
  activeCategory?: string;
}) {
  const listing = useServiceListing({
    category: activeCategory,
    initialServices,
  });

  const activeCat = categories.find((c) => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-brand-gray-60 flex flex-col">
      <MobilePageHeader title="Semua Layanan" titleAs="p" backHref="/" maxWidthClass="max-w-6xl" />
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 md:p-8">
        {/* Breadcrumb desktop . konsisten dengan /kategori/[slug] & /jasa/... */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[13px] text-brand-gray-400 mb-4">
          <Link href="/" className="hover:text-brand-red transition-colors">Beranda</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/services" className="hover:text-brand-red transition-colors">Semua Layanan</Link>
          {activeCat && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-brand-gray-900">{activeCat.name}</span>
            </>
          )}
        </nav>

        <h1 className="text-xl lg:text-2xl font-bold text-brand-gray-900 mb-6">Semua Layanan</h1>

        {/* Filter kategori (URL-driven via <Link>) */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
          <Link
            href="/services"
            className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors ${!activeCategory
                ? 'bg-brand-red text-white border-brand-red'
                : 'bg-white text-brand-gray-900 border-brand-gray-100 hover:border-brand-red'
              }`}
          >
            Semua
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/services?category=${cat.id}`}
              className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors ${activeCategory === cat.id
                  ? 'bg-brand-red text-white border-brand-red'
                  : 'bg-white text-brand-gray-900 border-brand-gray-100 hover:border-brand-red'
                }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        <ServiceListLayout
          services={listing.visibleServices}
          isLoading={listing.isLoading}
          isInitialLoading={listing.isLoading && listing.page === 1}
          isError={listing.isError}
          hasNextPage={listing.hasNextPage}
          onLoadMore={listing.loadMore}
          onRetry={listing.refetch}
          city={listing.city}
          onCityChange={listing.setCity}
          minRating={listing.minRating}
          onMinRatingChange={listing.setMinRating}
          sort={listing.sort}
          sortDir={listing.sortDir}
          onSortDirChange={listing.setSortDir}
          onSortChange={listing.setSort}
          partnerType={listing.partnerType}
          onPartnerTypeChange={listing.setPartnerType}
          minPrice={listing.minPrice}
          onMinPriceChange={listing.setMinPrice}
          maxPrice={listing.maxPrice}
          onMaxPriceChange={listing.setMaxPrice}
          isSearch={false}
        />
      </div>
    </div>
  );
}
