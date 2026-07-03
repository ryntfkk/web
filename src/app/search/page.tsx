import SearchContent from '@/components/search/SearchContent';
import { TOP_PARTNERS, FEATURED_SERVICES } from '@/lib/data';

interface SearchPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  // Combine some mock data to simulate search results (12 items)
  const searchResults = [...TOP_PARTNERS, ...FEATURED_SERVICES, ...TOP_PARTNERS];
  
  const query = typeof searchParams.q === 'string' ? searchParams.q : undefined;

  return (
    <div className="flex flex-col bg-white">
      {/* Main Content Area */}
      <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 md:px-6 lg:px-6 py-4 md:py-6 flex-1">
        <SearchContent searchResults={searchResults} query={query} />
      </div>
    </div>
  );
}
