"use client";

import Link from 'next/link';
import { Home, ClipboardList, MessageSquare, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useUnreadChatCount } from '@/hooks/useChatRooms';
import MitraBottomNav from './MitraBottomNav';

export default function BottomNav() {
  const pathname = usePathname();
  const activeRole = useAuthStore((s) => s.user?.active_role);
  // Badge unread realtime pada tab Chat (key ['chat-rooms'] di-invalidate WS).
  const unreadCount = useUnreadChatCount();

  // Sembunyikan BottomNav pada:
  // 1. Room chat (/chat/{id}) . area percakapan penuh; daftar chat (/chat) tetap tampil.
  // 2. Seluruh area mitra (/mitra/*) . punya MitraBottomNav sendiri / flow penuh.
  // 3. Halaman dengan action bar fixed di bawah (booking, payment, detail layanan,
  //    detail pesanan, form alamat) agar tombol aksi tidak tertutup nav.
  //    /orders exact tetap tampil karena Pesanan adalah tab utama.
  const p = pathname ?? '';

  // Mode Mitra: di halaman BERSAMA (chat list, notifikasi, dll) tampilkan
  // MitraBottomNav agar navigasi mitra tetap konsisten (docs 3.2 . Chat
  // adalah bagian dari mode mitra). Area /mitra/* merender nav-nya sendiri.
  if (activeRole === 'partner') {
    const hideForPartner =
      p.startsWith('/mitra') ||       // dirender oleh halaman mitra sendiri
      p.startsWith('/chat/') ||       // room chat = layar penuh
      p.startsWith('/bantuan/') ||    // ruang percakapan CS = layar penuh
      p.startsWith('/book') ||
      p.startsWith('/payment') ||
      p.startsWith('/orders/') ||
      p.startsWith('/services/') ||
      p.startsWith('/profile/'); // sub-halaman profil = drill-down (back header); /profile exact tetap tampil
    if (hideForPartner) return null;
    // `lg:hidden`, sama seperti nav pelanggan di bawah . dan ambang itulah yang
    // benar, bukan `md`.
    //
    // Ini halaman BERSAMA (/bantuan, /help, /notifications, /orders, /profile),
    // bukan area /mitra . dan di sini HeaderWrapper merender TopNavbar mulai
    // `lg`. Menyembunyikan nav mitra di `lg` persis mencegah mitra melihat
    // navbar pelanggan di atas dan nav mitra di dasar layar sekaligus, sementara
    // di bawah `lg` (768-1023px) nav ini justru satu-satunya navigasi yang ada.
    return (
      <div className="lg:hidden">
        {/* active_role 'partner' hanya untuk mitra yang SUDAH disetujui
            (lihat canEnterMitraShell), jadi navigasinya = versi approved penuh. */}
        <MitraBottomNav verification="APPROVED" />
      </div>
    );
  }

  const hideNav =
    p.startsWith('/chat/') ||
    // Ruang percakapan CS: layar penuh dengan kolom ketik di dasar layar. Tanpa
    // baris ini nav fixed z-50 duduk PERSIS di atas kolom ketiknya . bug paling
    // kentara di sistem bantuan versi lama.
    p.startsWith('/bantuan/') ||
    p.startsWith('/mitra') ||
    p.startsWith('/book') ||
    p.startsWith('/payment') ||
    p.startsWith('/orders/') ||
    // `/services/` dengan garis miring: yang punya bilah aksi fixed adalah
    // DETAIL layanan. Tanpa garis miring, halaman DAFTAR `/services` ikut
    // kehilangan bottom nav padahal ia halaman jelajah tanpa bilah aksi.
    p.startsWith('/services/') ||
    p.startsWith('/cart') ||
    p.startsWith('/profile/'); // sub-halaman profil = drill-down (back header); /profile exact tetap tampil
  if (hideNav) return null;

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
    /* Bottom Navigation . tampil sampai `lg`, tempat TopNavbar mengambil alih.
       Ambangnya HARUS `lg` (bukan `md`) dan sama dengan `hidden lg:block` di
       HeaderWrapper serta `pb-16 lg:pb-0` di <body>: ketiganya satu keputusan.
       Saat ambang ini `md`, rentang 768-1023px kehilangan SELURUH navigasi
       global . BottomNav sudah pergi, TopNavbar belum datang. */
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-gray-100 pb-safe z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
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
                  ? 'text-brand-red'
                  : 'text-brand-gray-400 hover:text-brand-gray-700'
                }
              `}
            >
              <span className="relative">
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.href === '/chat' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-brand-red text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
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
