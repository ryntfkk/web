"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, Menu, ShoppingCart, Bell, User, X } from 'lucide-react';

import { useAuthStore } from '@/lib/store/authStore';

export default function TopNavbar() {
  const { isAuthenticated, user } = useAuthStore();
  const userName = user?.name || "Pengguna";
  const userAvatar = user?.avatar_url;
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = e.currentTarget.value.trim();
      if (query) {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      } else {
        router.push('/search');
      }
      setIsMobileSearchOpen(false); // Close mobile search if open
    }
  };

  const navLinks = [
    { label: 'Kategori', href: '/categories' },
    { label: 'Promo', href: '/promos' },
    { label: 'Bantuan', href: '/help' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#e5e2e1] bg-[#fcf9f8]">
        {/* Outer container: 40px horizontal padding, max-width 1200px */}
        <div className="mx-auto h-16 max-w-[1200px] px-4 sm:px-6 flex items-center justify-between lg:px-6">
          {isMobileSearchOpen ? (
            <div className="flex-1 flex items-center gap-2 w-full lg:hidden animate-in fade-in duration-200">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-[#8f6f6d]" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-full border border-[#e5e2e1] bg-white py-2 pl-9 pr-4 text-[14px] text-[#1c1b1b] placeholder:text-[#8f6f6d] focus:border-[#b51822] focus:outline-none focus:ring-1 focus:ring-[#b51822]"
                  placeholder="Cari jasa AC, ledeng, kebersihan..."
                  autoFocus
                  onKeyDown={handleSearch}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSearchOpen(false)}
                className="text-[#5b403e] hover:text-[#b51822] shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <>
              {/* Left Section: Logo + Nav Links */}
              <div className="flex items-center gap-6">
            {/* Logo - Image + POSKO text in black */}
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image 
                  src="/logo.png" 
                  alt="POSKO JASA Logo" 
                  fill 
                  className="object-contain" 
                  priority
                />
              </div>
              <span className="text-[24px] font-bold text-[#1c1b1b] tracking-[-0.6px] whitespace-nowrap">
                POSKO
              </span>
            </Link>

            {/* Desktop Nav Links - hidden on mobile */}
            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[16px] font-normal text-[#5b403e] hover:text-[#b51822] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center Section: Search Bar (Desktop) */}
          {/* max-width 512px, flex grow, centered */}
          <div className="hidden lg:flex flex-1 justify-center px-8">
            <div className="relative w-full max-w-[512px]">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Search className="h-[18px] w-[18px] text-[#8f6f6d]" />
              </div>
              <input
                type="text"
                className="block w-full rounded-[2px] border border-[#e5e2e1] bg-white py-2.5 pl-4 pr-10 text-[14px] text-[#1c1b1b] placeholder:text-[#8f6f6d] focus:border-[#b51822] focus:outline-none focus:ring-1 focus:ring-[#b51822]"
                placeholder="Cari jasa AC, ledeng, kebersihan..."
                onKeyDown={handleSearch}
              />
            </div>
          </div>

          {/* Right Section: Actions */}
          <div className="flex items-center gap-4">
            {/* Mobile Search Button - visible only on mobile/tablet */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[#5b403e] hover:text-[#b51822]"
              onClick={() => setIsMobileSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {isAuthenticated ? (
              /* Logged In State */
              <div className="hidden lg:flex items-center gap-4">
                {/* Cart Icon - 19.98x20px */}
                <button className="text-[#5b403e] hover:text-[#b51822] transition-colors">
                  <ShoppingCart className="h-[20px] w-[19.98px]" />
                </button>

                {/* Bell Icon - 16x20px, gap 16px */}
                <button className="text-[#5b403e] hover:text-[#b51822] transition-colors relative">
                  <Bell className="h-5 w-4" />
                  {/* Notification dot */}
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#b51822] rounded-full" />
                </button>

                {/* User Avatar - 32x32px, border-radius 12px */}
                <button className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[12px] border border-[#e5e2e1] bg-[#e5e2e1] flex items-center justify-center overflow-hidden">
                    {userAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-[#5b403e]" />
                    )}
                  </div>
                </button>
              </div>
            ) : (
              /* Logged Out State */
              <div className="hidden lg:flex items-center gap-2">
                <Link 
                  href="/login" 
                  className="inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-[2px] transition-all duration-200 bg-transparent text-[#5b403e] hover:text-[#b51822] hover:bg-[#f0eded] h-[44px] px-4 py-3"
                >
                  Masuk
                </Link>
                <Link 
                  href="/register"
                  className="inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-[2px] transition-all duration-200 bg-[#b51822] text-white hover:bg-[#90121a] h-[44px] px-4 py-3"
                >
                  Daftar
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle - visible only on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[#5b403e] hover:text-[#b51822]"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
            </>
          )}
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer - slide from left */}
          <div className="fixed top-0 left-0 h-full w-[280px] bg-white z-50 shadow-lg lg:hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#e5e2e1]">
              <div className="flex items-center gap-2">
                <div className="relative w-6 h-6">
                  <Image 
                    src="/logo.png" 
                    alt="POSKO JASA Logo" 
                    fill 
                    className="object-contain" 
                  />
                </div>
                <span className="text-[20px] font-bold text-[#1c1b1b]">POSKO</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#5b403e] hover:text-[#b51822]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="p-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[16px] font-normal text-[#5b403e] hover:text-[#b51822] py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <hr className="border-[#e5e2e1] my-2" />

              {isAuthenticated ? (
                <>
                  <Link href="/orders" className="text-[16px] text-[#5b403e] py-2" onClick={() => setIsMobileMenuOpen(false)}>Pesanan</Link>
                  <Link href="/wallet" className="text-[16px] text-[#5b403e] py-2" onClick={() => setIsMobileMenuOpen(false)}>Dompet</Link>
                  <Link href="/profile" className="text-[16px] text-[#5b403e] py-2" onClick={() => setIsMobileMenuOpen(false)}>Profil</Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-[2px] transition-all duration-200 bg-transparent text-[#b51822] border border-[#b51822] hover:bg-[#f0eded] h-[44px] px-4 py-3"
                  >
                    Masuk
                  </Link>
                  <Link 
                    href="/register" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-[2px] transition-all duration-200 bg-[#b51822] text-white hover:bg-[#90121a] h-[44px] px-4 py-3"
                  >
                    Daftar
                  </Link>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
