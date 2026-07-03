"use client";

import { useState } from 'react';
import Breadcrumbs from '@/components/search/Breadcrumbs';
import FilterPanel from '@/components/search/FilterPanel';
import SortBar from '@/components/search/SortBar';
import Pagination from '@/components/search/Pagination';
import { ServiceCard } from '@/components/ui/service-card';

interface SearchContentProps {
  searchResults: any[];
  query?: string;
}

export default function SearchContent({ searchResults, query }: SearchContentProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mt-4 md:mt-6">
            {searchResults.map((service, idx) => (
              <ServiceCard key={idx} {...service} />
            ))}
          </div>

          <Pagination />
        </div>
      </div>
    </>
  );
}
