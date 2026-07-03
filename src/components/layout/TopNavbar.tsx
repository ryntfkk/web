import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, Menu, User } from 'lucide-react';

export default function TopNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-[#fcf9f8]/95 backdrop-blur supports-[backdrop-filter]:bg-[#fcf9f8]/80">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            {/* Logo Text - 24sp Bold #b51822 with -0.6px letter spacing */}
            <span className="text-[24px] font-bold text-brand-red tracking-[-0.6px]">
              POSKO JASA
            </span>
          </Link>
        </div>

        {/* Search Bar (Desktop) */}
        <div className="hidden flex-1 items-center justify-center px-8 md:flex">
          <div className="relative w-full max-w-lg">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-brand-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-full border border-border bg-white py-2 pl-10 pr-4 text-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
              placeholder="Cari jasa AC, ledeng, kebersihan..."
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Mobile Search Button */}
          <Button variant="ghost" size="icon" className="md:hidden text-brand-gray-700">
            <Search className="h-5 w-5" />
          </Button>

          {/* Login / Register (Desktop) */}
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" className="text-brand-gray-700 hover:text-brand-red">
              Masuk
            </Button>
            <Button className="bg-brand-red text-white hover:bg-brand-red-dark">
              Daftar
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden text-brand-gray-700">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
