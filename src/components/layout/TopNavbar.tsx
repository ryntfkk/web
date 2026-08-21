"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, ShoppingCart, Bell, User, X, ChevronDown, Package, Wallet, Heart, TicketPercent, HelpCircle, LogOut, MessageSquare } from 'lucide-react';

import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadChatCount } from '@/hooks/useChatRooms';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

export default function TopNavbar() {
  const { isAuthenticated, isInitializing, user } = useAuthStore();
  // Logout HARUS lewat useAuth agar sesi server (cookie refresh) benar-benar dicabut.
  const { logout } = useAuth();
  const itemCount = useCartStore((s) => s.itemCount);
  // Angka SUNGGUHAN. Titik merah lonceng dulu dirender tanpa syarat . menyala
  // selamanya, termasuk di akun yang baru dibuat (audit A3).
  const unreadNotifications = useUnreadNotifications();
  const unreadChats = useUnreadChatCount();
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
    // useAuth.logout: POST /auth/logout → bersihkan store → router.push('/login')
    logout();
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = e.currentTarget.value.trim();
      if (query) {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      } else {
        // Input kosong = user ingin menjelajah semua layanan → rute kanonik /services.
        router.push('/services');
      }
      setIsMobileSearchOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-brand-gray-100 bg-brand-gray-50">
        <div className="mx-auto h-16 max-w-[1200px] px-4 sm:px-6 flex items-center justify-between lg:px-6">
          {isMobileSearchOpen ? (
            <div className="flex-1 flex items-center gap-2 w-full lg:hidden animate-in fade-in duration-200">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-brand-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-md border border-brand-gray-100 bg-white py-2 pl-9 pr-4 text-[14px] text-brand-gray-900 placeholder:text-brand-gray-400 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
                  placeholder="Cari jasa AC, ledeng, kebersihan..."
                  autoFocus
                  onKeyDown={handleSearch}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Tutup pencarian"
                onClick={() => setIsMobileSearchOpen(false)}
                className="text-brand-gray-700 hover:text-brand-red shrink-0"
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
                      sizes="32px"
                    />
                  </div>
                  <span className="text-[24px] font-bold text-brand-gray-900 tracking-[-0.6px] whitespace-nowrap">
                    POSKO
                  </span>
                </Link>
              </div>

              {/* Center Section: Search Bar (Desktop) */}
              <div className="hidden lg:flex flex-1 justify-center px-8">
                <div className="relative w-full max-w-[512px]">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search className="h-[18px] w-[18px] text-brand-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full rounded-md border border-brand-gray-100 bg-white py-2.5 pl-4 pr-10 text-[14px] text-brand-gray-900 placeholder:text-brand-gray-400 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
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
                  aria-label="Cari jasa"
                  className="lg:hidden text-brand-gray-700 hover:text-brand-red"
                  onClick={() => setIsMobileSearchOpen(true)}
                >
                  <Search className="h-5 w-5" />
                </Button>

                {isInitializing ? (
                  <div className="flex items-center gap-2 lg:gap-4 animate-pulse">
                    <div className="hidden lg:block w-8 h-8 bg-brand-gray-100 rounded-full" />
                    <div className="hidden lg:block w-8 h-8 bg-brand-gray-100 rounded-full" />
                    <div className="w-8 h-8 bg-brand-gray-100 rounded-xl" />
                  </div>
                ) : isAuthenticated ? (
                  <>
                    {/* Desktop: Cart & Bell */}
                    <div className="hidden lg:flex items-center gap-4">
                      {/* Cart Icon */}
                      <button
                        className="text-brand-gray-700 hover:text-brand-red transition-colors relative"
                        aria-label={`Keranjang${itemCount > 0 ? ` (${itemCount})` : ''}`}
                        onClick={() => router.push('/cart')}
                      >
                        <ShoppingCart className="h-[20px] w-[19.98px]" />
                        {itemCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-brand-red text-white text-[11px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold px-1">
                            {itemCount > 99 ? '99+' : itemCount}
                          </span>
                        )}
                      </button>

                      {/* Chat . di desktop ini SATU-SATUNYA jalan ke /chat.
                          BottomNav (yang memuat tab Chat) berhenti di `lg`, dan
                          sebelum ini tidak ada penggantinya: pengguna desktop
                          harus mengetik URL-nya sendiri (audit A2). */}
                      <button
                        className="text-brand-gray-700 hover:text-brand-red transition-colors relative"
                        onClick={() => router.push('/chat')}
                        aria-label={`Chat${unreadChats > 0 ? ` (${unreadChats} belum dibaca)` : ''}`}
                      >
                        <MessageSquare className="h-5 w-5" />
                        {unreadChats > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-brand-red text-white text-[11px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold px-1">
                            {unreadChats > 99 ? '99+' : unreadChats}
                          </span>
                        )}
                      </button>

                      {/* Bell Icon */}
                      <button
                        className="text-brand-gray-700 hover:text-brand-red transition-colors relative"
                        onClick={() => router.push('/notifications')}
                        aria-label={`Notifikasi${unreadNotifications > 0 ? ` (${unreadNotifications} belum dibaca)` : ''}`}
                      >
                        <Bell className="h-5 w-5" />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-brand-red text-white text-[11px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold px-1">
                            {unreadNotifications > 99 ? '99+' : unreadNotifications}
                          </span>
                        )}
                      </button>

                      {/* User Avatar with Dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        {/* Nama tombol TIDAK boleh bergantung pada avatar: saat
                            foto profil kosong isinya cuma ikon <User> + chevron,
                            dan pembaca layar mengumumkan "tombol" tanpa
                            keterangan apa pun. */}
                        <button
                          className="flex items-center gap-2"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          aria-expanded={isDropdownOpen}
                          aria-haspopup="true"
                          aria-label={`Menu akun ${userName}`}
                        >
                          <div className="w-8 h-8 rounded-xl border border-brand-gray-100 bg-brand-gray-100 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-brand-red transition-all">
                            {userAvatar ? (
                              <Image
                                src={userAvatar}
                                alt={userName}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-brand-gray-700" />
                            )}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-brand-gray-700 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                          <div className="absolute right-0 mt-2 w-56 bg-white border border-brand-gray-100 rounded-lg shadow-lg py-2 z-50">
                            {/* Info singkat */}
                            <div className="px-4 py-2 mb-1">
                              <p className="text-sm font-bold text-brand-gray-900 truncate">{userName}</p>
                              {user?.active_role === 'partner' && (
                                <span className="inline-block mt-0.5 px-2 py-0.5 bg-brand-red/10 text-brand-red text-[11px] font-bold rounded-full">Mode Mitra</span>
                              )}
                            </div>
                            <hr className="my-1 border-brand-gray-100" />
                            
                            <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-brand-gray-700 hover:bg-brand-gray-50 hover:text-brand-red transition-colors" onClick={() => setIsDropdownOpen(false)}>
                              <User className="w-4 h-4" />
                              Profil
                            </Link>
                            <Link href="/orders" className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-brand-gray-700 hover:bg-brand-gray-50 hover:text-brand-red transition-colors" onClick={() => setIsDropdownOpen(false)}>
                              <Package className="w-4 h-4" />
                              Pesanan
                            </Link>
                            <Link href="/chat" className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-brand-gray-700 hover:bg-brand-gray-50 hover:text-brand-red transition-colors" onClick={() => setIsDropdownOpen(false)}>
                              <MessageSquare className="w-4 h-4" />
                              Chat
                              {unreadChats > 0 && (
                                <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-brand-red px-1 text-[11px] font-bold leading-none text-white flex items-center justify-center">
                                  {unreadChats > 99 ? '99+' : unreadChats}
                                </span>
                              )}
                            </Link>
                            <Link href="/profile/wallet" className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-brand-gray-700 hover:bg-brand-gray-50 hover:text-brand-red transition-colors" onClick={() => setIsDropdownOpen(false)}>
                              <Wallet className="w-4 h-4" />
                              Dompet
                            </Link>
                            <Link href="/promos" className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-brand-gray-700 hover:bg-brand-gray-50 hover:text-brand-red transition-colors" onClick={() => setIsDropdownOpen(false)}>
                              <TicketPercent className="w-4 h-4" />
                              Promo
                            </Link>
                            <Link href="/profile/favorites" className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-brand-gray-700 hover:bg-brand-gray-50 hover:text-brand-red transition-colors" onClick={() => setIsDropdownOpen(false)}>
                              <Heart className="w-4 h-4" />
                              Favorit
                            </Link>
                            <Link href="/help" className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-brand-gray-700 hover:bg-brand-gray-50 hover:text-brand-red transition-colors" onClick={() => setIsDropdownOpen(false)}>
                              <HelpCircle className="w-4 h-4" />
                              Bantuan
                            </Link>

                            <hr className="my-1 border-brand-gray-100" />
                            <button
                              onClick={() => {
                                setIsDropdownOpen(false);
                                handleLogout();
                              }}
                              className="w-full flex items-center gap-3 text-left px-4 py-2.5 text-[14px] text-brand-red hover:bg-brand-red-soft font-semibold transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
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
                        className="relative flex h-10 w-10 items-center justify-center text-brand-gray-700 hover:text-brand-red transition-colors"
                        onClick={() => router.push('/cart')}
                        aria-label="Keranjang"
                      >
                        <ShoppingCart className="h-[22px] w-[22px]" />
                        {itemCount > 0 && (
                          <span className="absolute top-0 right-0 bg-brand-red text-white text-[11px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold px-1">
                            {itemCount > 99 ? '99+' : itemCount}
                          </span>
                        )}
                      </button>

                      {/* Bell Icon */}
                      <button
                        className="relative flex h-10 w-10 items-center justify-center text-brand-gray-700 hover:text-brand-red transition-colors"
                        aria-label={`Notifikasi${unreadNotifications > 0 ? ` (${unreadNotifications} belum dibaca)` : ''}`}
                        onClick={() => router.push('/notifications')}
                      >
                        <Bell className="h-[22px] w-[22px]" />
                        {unreadNotifications > 0 && (
                          <span className="absolute top-0 right-0 bg-brand-red text-white text-[11px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold px-1">
                            {unreadNotifications > 99 ? '99+' : unreadNotifications}
                          </span>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Desktop: Login/Register */}
                    <div className="hidden lg:flex items-center gap-2">
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-md transition-all duration-200 bg-transparent text-brand-gray-700 hover:text-brand-red hover:bg-brand-red-light h-[44px] px-4 py-3"
                      >
                        Masuk
                      </Link>
                      <Link
                        href="/register"
                        className="inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-md transition-all duration-200 bg-brand-red text-white hover:bg-brand-red-dark h-[44px] px-4 py-3"
                      >
                        Daftar
                      </Link>
                    </div>

                    {/* Mobile: Login/Register */}
                    <div className="lg:hidden flex items-center gap-2">
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-md transition-all duration-200 bg-transparent text-brand-gray-700 hover:text-brand-red hover:bg-brand-red-light h-[36px] px-3"
                      >
                        Masuk
                      </Link>
                      <Link
                        href="/register"
                        className="inline-flex items-center justify-center font-bold text-[14px] leading-none rounded-md transition-all duration-200 bg-brand-red text-white hover:bg-brand-red-dark h-[36px] px-3"
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
