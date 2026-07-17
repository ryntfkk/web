import SearchContent from '@/components/search/SearchContent';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : undefined;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-[#f7f5f4]">
      {/* Sticky Page Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10 lg:relative lg:z-auto">
        <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 md:px-6 lg:px-6">
          <div className="flex items-center gap-3 py-4">
            <Link href="/" className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded-md transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </Link>
            <h1 className="text-base font-bold text-[#1c1b1b] truncate">
              {query ? `Hasil untuk "${query}"` : 'Cari Jasa'}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 md:px-6 lg:px-6 py-4 md:py-6 flex-1 pb-24 md:pb-8">
        <SearchContent query={query} />
      </div>

    </div>
  );
}
