import Breadcrumbs from '@/components/search/Breadcrumbs';
import FilterPanel from '@/components/search/FilterPanel';
import SortBar from '@/components/search/SortBar';
import Pagination from '@/components/search/Pagination';
import { ServiceCard } from '@/components/ui/service-card';
import { TOP_PARTNERS, FEATURED_SERVICES } from '@/lib/data';

export default function SearchPage() {
  // Combine some mock data to simulate search results (12 items)
  const searchResults = [...TOP_PARTNERS, ...FEATURED_SERVICES, ...TOP_PARTNERS];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Main Content Area */}
      <div className="container mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 pt-6 pb-12 flex-1">
        <Breadcrumbs query="Cleaning Service" />
        
        {/* Container (Filter + Results) */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <FilterPanel />
          
          {/* Main Results Area */}
          <div className="flex-1 flex flex-col w-full min-w-0">
            <SortBar />
            
            {/* Service Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {searchResults.map((service, idx) => (
                <ServiceCard key={idx} {...service} />
              ))}
            </div>

            <Pagination />
          </div>
        </div>
      </div>
    </div>
  );
}
