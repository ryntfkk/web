"use client";

import { useState } from 'react';
import Breadcrumbs from '@/components/search/Breadcrumbs';
import FilterPanel from '@/components/search/FilterPanel';
import SortBar from '@/components/search/SortBar';
import Pagination from '@/components/search/Pagination';
import { ServiceCard } from '@/components/ui/service-card';
import { usePartners } from '@/hooks/usePartners';

interface SearchContentProps {
  query?: string;
}

export default function SearchContent({ query }: SearchContentProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  const { data: partners, isLoading, isError } = usePartners({
    q: query,
    per_page: 12
  });

  return (
    <>
      <Breadcrumbs query={query} />
      
      {/* Container (Filter + Results) */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
        <FilterPanel isOpen={isMobileFilterOpen} onClose={() => setIsMobileFilterOpen(false)} />
        
        {/* Main Results Area */}
        <div className="flex-1 flex flex-col w-full min-w-0">
          <SortBar onOpenFilter={() => setIsMobileFilterOpen(true)} />
          
          {/* Service Card Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mt-4 md:mt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[250px] bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <div className="mt-6 text-sm text-red-500">Gagal memuat hasil pencarian.</div>
          ) : partners?.length === 0 ? (
            <div className="mt-6 text-center text-gray-500 py-10">Belum ada mitra di area ini.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mt-4 md:mt-6">
              {partners?.map((partner: any) => (
                <ServiceCard 
                  key={partner.id} 
                  vendorName={partner.name}
                  category={partner.categories?.[0]?.name || "Umum"}
                  rating={partner.avg_rating || 0}
                  reviewCount={partner.total_reviews || 0}
                  price={partner.starting_price || 0}
                  unit="Jasa"
                  imageUrl={(typeof partner.avatar_url === 'object' ? partner.avatar_url?.String : partner.avatar_url) || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"}
                  location={`${partner.distance_km || 0} km`}
                />
              ))}
            </div>
          )}

          <Pagination />
        </div>
      </div>
    </>
  );
}
