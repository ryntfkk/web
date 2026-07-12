"use client";

import Link from 'next/link';
import { LayoutDashboard, Package, MessageSquare, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/mitra/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/mitra/orders', label: 'Pesanan', icon: Package },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/mitra/profile', label: 'Profil', icon: Settings },
];

export default function MitraBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] pb-safe z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${
                isActive ? 'text-[#b51822]' : 'text-[#8f6f6d] hover:text-[#5b403e]'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[12px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
