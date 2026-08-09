"use client";

import Link from 'next/link';
import { LayoutDashboard, Package, MessageSquare, Settings, ClipboardCheck, CalendarDays } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUnreadChatCount } from '@/hooks/useChatRooms';

const navItems = [
  { href: '/mitra/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/mitra/orders', label: 'Pesanan', icon: Package },
  { href: '/mitra/chat', label: 'Chat', icon: MessageSquare },
  { href: '/mitra/profile', label: 'Profil', icon: Settings },
];

// Navigasi mitra yang BELUM disetujui: hanya tujuan yang benar-benar bisa ia
// pakai (P1-10). Menawarkan "Pesanan" lalu melemparnya kembali ke halaman
// status adalah jebakan, bukan navigasi.
// Jadwal ikut di sini karena mitra pending MEMANG boleh menyiapkannya . halaman
// /mitra/schedule terbuka untuknya dan menampilkan PreparationNotice. Di desktop
// tujuan itu selalu ada di sidebar; di ponsel ia sebelumnya tidak punya jalur
// sama sekali, jadi satu-satunya cara ke sana adalah mengetik URL.
const pendingNavItems = [
  { href: '/mitra/verification-status', label: 'Status', icon: ClipboardCheck },
  { href: '/mitra/services', label: 'Layanan', icon: Package },
  { href: '/mitra/schedule', label: 'Jadwal', icon: CalendarDays },
  { href: '/mitra/profile', label: 'Profil', icon: Settings },
];

export default function MitraBottomNav({ approved = true }: { approved?: boolean }) {
  const pathname = usePathname();
  const unreadCount = useUnreadChatCount();
  const items = approved ? navItems : pendingNavItems;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-gray-100 pb-safe z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${
                isActive ? 'text-brand-red' : 'text-brand-gray-400 hover:text-brand-gray-700'
              }`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {item.href === '/mitra/chat' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-brand-red text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="text-[12px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
