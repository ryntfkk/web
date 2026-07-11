"use client";

import Link from 'next/link';
import { Home, ClipboardList, MessageSquare, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  // Sembunyikan di dalam room chat (/chat/{id}) agar area percakapan penuh;
  // tetap tampil di daftar chat (/chat) karena Chat adalah tab utama.
  const isChatRoom = pathname?.startsWith('/chat/');
  if (isChatRoom) return null;

  if (pathname.startsWith('/chat')) return null;

  const navItems = [
    {
      icon: Home,
      activeIcon: Home, // Use solid version in production
      label: 'Beranda',
      href: '/'
    },
    {
      icon: ClipboardList,
      activeIcon: ClipboardList,
      label: 'Pesanan',
      href: '/orders'
    },
    {
      icon: MessageSquare,
      activeIcon: MessageSquare,
      label: 'Chat',
      href: '/chat'
    },
    {
      icon: User,
      activeIcon: User,
      label: 'Profil',
      href: '/profile'
    },
  ];

  return (
    /* Bottom Navigation - hidden on desktop (md:hidden) */
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] pb-safe z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = isActive ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center
                flex-1 h-full space-y-1
                transition-colors duration-200
                ${isActive
                  ? 'text-[#b51822]'
                  : 'text-[#8f6f6d] hover:text-[#5b403e]'
                }
              `}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[12px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
