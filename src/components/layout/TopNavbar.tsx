"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Menu, ShoppingCart, Bell, User, X } from 'lucide-react';

interface TopNavbarProps {
  isLoggedIn?: boolean;
  userName?: string;
  userAvatar?: string;
}

export default function TopNavbar({
  isLoggedIn = false,
  userName = "Pengguna",
  userAvatar,
}: TopNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Kategori', href: '/categories' },
    { label: 'Promo', href: '/promos' },
    { label: 'Bantuan', href: '/help' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#e5e2e1] bg-[#fcf9f8]">
        {/* Outer container: 40px horizontal padding, max-width 1200px */}
        <div className="mx-auto h-16 max-w-[1200px] px-6 flex items-center justify-between lg:px-6">

          {/* Left Section: Logo + Nav Links */}
          <div className="flex items-center gap-6">
            {/* Logo - 24sp Bold #b51822 with -0.6px letter spacing */}
            <Link href="/" className="flex items-center">
              <span className="text-[24px] font-bold text-[#b51822] tracking-[-0.6px] whitespace-nowrap">
                POSKO JASA
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
            >
              <Search className="h-5 w-5" />
            </Button>

            {isLoggedIn ? (
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
                <Button variant="ghost" className="text-[#5b403e] hover:text-[#b51822]">
                  Masuk
                </Button>
                <Button variant="primary" size="default">
                  Daftar
                </Button>
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
              <span className="text-[20px] font-bold text-[#b51822]">POSKO JASA</span>
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

              {isLoggedIn ? (
                <>
                  <Link href="/orders" className="text-[16px] text-[#5b403e] py-2">Pesanan</Link>
                  <Link href="/wallet" className="text-[16px] text-[#5b403e] py-2">Dompet</Link>
                  <Link href="/profile" className="text-[16px] text-[#5b403e] py-2">Profil</Link>
                </>
              ) : (
                <>
                  <Button variant="secondary" size="default" className="w-full">
                    Masuk
                  </Button>
                  <Button variant="primary" size="default" className="w-full">
                    Daftar
                  </Button>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
