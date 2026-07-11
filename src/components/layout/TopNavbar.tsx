"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, ShoppingCart, Bell, User, X, ChevronDown } from 'lucide-react';

import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';

export default function TopNavbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.itemCount);
  const userName = user?.name || "Pengguna";
  const userAvatar = user?.avatar_url;

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = e.currentTarget.value.trim();
      if (query) {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      } else {
        router.push('/search');
      }
      setIsMobileSearchOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#e5e2e1] bg-[#fcf9f8]">
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
              {/* Left Section: Logo */}
              <div className="flex items-center">
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
              </div>

              {/* Center Section: Search Bar (Desktop) */}
              <div className="hidden lg:flex flex-1 justify-center px-8">
                <div className="relative w-full max-w-[512px]">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search className="h-[18px] w-[18px] text-[#8f6f6d]" />
                  </div>
                  <input
                    type="text"
                    className="block w-full rounded-md border border-[#e5e2e1] bg-white py-2.5 pl-4 pr-10 text-[14px] text-[#1c1b1b] placeholder:text-[#8f6f6d] focus:border-[#b51822] focus:outline-none focus:ring-1 focus:ring-[#b51822]"
                    placeholder="Cari jasa AC, ledeng, kebersihan..."
                    onKeyDown={handleSearch}
                  />
                </div>
              </div>

              {/* Right Section: Actions */}
              <div className="flex items-center gap-1 lg:gap-4">
                {/* Mobile Search Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-[#5b403e] hover:text-[#b51822]"
                  onClick={() => setIsMobileSearchOpen(true)}
                >
                  <Search className="h-5 w-5" />
                </Button>

                {isAuthenticated ? (
                  <>
                    {/* Desktop: Cart & Bell */}
                    <div className="hidden lg:flex items-center gap-4">
                      {/* Cart Icon */}
                      <button
                        className="text-[#5b403e] hover:text-[#b51822] transition-colors relative"
                        onClick={() => router.push('/cart')}
                      >
                        <ShoppingCart className="h-[20px] w-[19.98px]" />
                        {itemCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-[#b51822] text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold px-1">
                            {itemCount > 99 ? '99+' : itemCount}
                          </span>
                        )}
                      </button>

                      {/* Bell Icon */}
                      <button
                        className="text-[#5b403e] hover:text-[#b51822] transition-colors relative"
                        onClick={() => router.push('/notifications')}
                        aria-label="Notifikasi"
                      >
                        <Bell className="h-5 w-5" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#b51822] rounded-full" />
                      </button>

                      {/* User Avatar with Dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <button
                          className="flex items-center gap-2"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          aria-expanded={isDropdownOpen}
                          aria-haspopup="true"
                        >
                          <div className="w-8 h-8 rounded-[12px] border border-[#e5e2e1] bg-[#e5e2e1] flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-[#b51822] transition-all">
                            {userAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-[#5b403e]" />
                            )}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-[#5b403e] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e5e2e1] rounded-lg shadow-lg py-2 z-50">
                            <Link href="/profile" className="block px-4 py-2 text-[14px] text-[#5b403e] hover:bg-[#f7f5f4] hover:text-[#b51822]" onClick={() => setIsDropdownOpen(false)}>
                              Akun Saya
                            </Link>
                            <Link href="/orders" className="block px-4 py-2 text-[14px] text-[#5b403e] hover:bg-[#f7f5f4] hover:text-[#b51822]" onClick={() => setIsDropdownOpen(false)}>
                              Pesanan Saya
                            </Link>
                            <hr className="my-1 border-[#e5e2e1]" />
                            <button
                              onClick={() => {
                                setIsDropdownOpen(false);
                                handleLogout();
                              }}
                              className="w-full text-left block px-4 py-2 text-[14px] text-[#b51822] hover:bg-[#fdf2f2] font-semibold"
                            >
                              Logout
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mobile: Cart & Bell */}
                    <div className="lg:hidden flex items-center gap-1">
                      {/* Cart Icon */}
                      <button
                        className="relative flex h-10 w-10 items-center justify-center text-[#5b403e] hover:text-[#b51822] transition-colors"
                        onClick={() => router.push('/cart')}
                        aria-label="Keranjang"
                      >
                        <ShoppingCart className="h-[22px] w-[22px]" />
                        {itemCount > 0 && (
                          <span className="absolute top-0 right-0 bg-[#b51822] text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold px-1">
                            {itemCount > 99 ? '99+' : itemCount}
                          </span>
                        )}
                      </button>

                      {/* Bell Icon */}
                      <button
                        className="relative flex h-10 w-10 items-center justify-center text-[#5b403e] hover:text-[#b51822] transition-colors"
                        aria-label="Notifikasi"
                        onClick={() => router.push('/notifications')}
                      >
                        <Bell className="h-[22px] w-[22px]" />
                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#b51822] rounded-full" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Desktop: Login/Register */}
                    <div className="hidden lg:flex items-center gap-2">
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-md transition-all duration-200 bg-transparent text-[#5b403e] hover:text-[#b51822] hover:bg-[#f0eded] h-[44px] px-4 py-3"
                      >
                        Masuk
                      </Link>
                      <Link
                        href="/register"
                        className="inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-md transition-all duration-200 bg-[#b51822] text-white hover:bg-[#90121a] h-[44px] px-4 py-3"
                      >
                        Daftar
                      </Link>
                    </div>

                    {/* Mobile: Login/Register */}
                    <div className="lg:hidden flex items-center gap-2">
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-md transition-all duration-200 bg-transparent text-[#5b403e] hover:text-[#b51822] hover:bg-[#f0eded] h-[36px] px-3"
                      >
                        Masuk
                      </Link>
                      <Link
                        href="/register"
                        className="inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-md transition-all duration-200 bg-[#b51822] text-white hover:bg-[#90121a] h-[36px] px-3"
                      >
                        Daftar
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </header>
    </>
  );
}
