import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbsProps {
  query?: string;
}

export default function Breadcrumbs({ query = "Semua Kategori" }: { query?: string }) {
  return (
    <nav className="hidden md:flex items-center gap-[11px] text-[14px] text-brand-gray-400 mb-[15px]">
      <Link href="/" className="hover:text-brand-red transition-colors">
        Home
      </Link>
      <ChevronRight className="w-3 h-3 text-brand-gray-700" />
      <span className={query ? "text-[14px] text-brand-gray-700" : "text-[14px] text-brand-gray-900"}>
        Search
      </span>
      {query && (
        <>
          <ChevronRight className="w-3 h-3 text-brand-gray-700" />
          <span className="text-[14px] text-brand-gray-900">
            "{query}"
          </span>
        </>
      )}
    </nav>
  );
}
