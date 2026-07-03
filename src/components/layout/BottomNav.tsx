"use client";

import Link from 'next/link';
import { Home, ClipboardList, MessageSquare, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Beranda', href: '/' },
    { icon: ClipboardList, label: 'Pesanan', href: '/orders' },
    { icon: MessageSquare, label: 'Chat', href: '/chat' },
    { icon: User, label: 'Profil', href: '/profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-border pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-brand-red' : 'text-brand-gray-400 hover:text-brand-gray-700'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
