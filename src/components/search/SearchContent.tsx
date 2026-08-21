"use client";

import { useEffect } from 'react';
import Breadcrumbs from '@/components/search/Breadcrumbs';
import ServiceListLayout from '@/components/services/ServiceListLayout';
import { useServiceListing } from '@/hooks/useServiceListing';
import { useRecentSearchesStore } from '@/lib/store/recentSearchesStore';

interface SearchContentProps {
  query?: string;
}

export default function SearchContent({ query }: SearchContentProps) {
  const recordSearch = useRecentSearchesStore((s) => s.record);
  useEffect(() => {
    if (query) recordSearch(query);
    // `recordSearch` adalah aksi Zustand yang identitasnya stabil; memasukkannya
    // ke deps hanya menambah kebisingan. Yang harus memicu pencatatan cuma kata
    // kuncinya.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps sengaja dipersempit, lihat catatan di atas
  }, [query]);

  const listing = useServiceListing({ query });

  return (
    <>
      <Breadcrumbs query={query} />

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
        partnerType={listing.partnerType}
        onPartnerTypeChange={listing.setPartnerType}
        minPrice={listing.minPrice}
        onMinPriceChange={listing.setMinPrice}
        maxPrice={listing.maxPrice}
        onMaxPriceChange={listing.setMaxPrice}
        onSortChange={listing.setSort}
        isSearch={true}
        query={query}
      />
    </>
  );
}
