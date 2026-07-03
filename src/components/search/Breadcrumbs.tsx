import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbsProps {
  query?: string;
}

export default function Breadcrumbs({ query }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 mb-6">
      <Link href="/" className="text-[14px] text-[#5b403e] hover:text-[#b51822] transition-colors">
        Home
      </Link>
      <ChevronRight className="w-3 h-3 text-[#5b403e]" />
      <span className={query ? "text-[14px] text-[#5b403e]" : "text-[14px] text-[#1c1b1b]"}>
        Search
      </span>
      {query && (
        <>
          <ChevronRight className="w-3 h-3 text-[#5b403e]" />
          <span className="text-[14px] text-[#1c1b1b]">
            "{query}"
          </span>
        </>
      )}
    </nav>
  );
}
