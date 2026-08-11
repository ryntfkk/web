import {
  LayoutDashboard,
  Package,
  Wrench,
  CalendarDays,
  MessageSquare,
  Star,
  Wallet,
  User,
  ShieldCheck,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Definisi navigasi mode mitra . SATU sumber untuk sidebar desktop
 * (`MitraSidebar`) DAN bottom-nav mobile (`MitraBottomNav`).
 *
 * Dulu keduanya mendefinisikan menunya sendiri-sendiri, jadi bottom-nav mobile
 * tertinggal 6 tujuan yang ada di sidebar (audit A7). Menyatukannya di sini
 * membuat "tab Lainnya" mobile mustahil menyimpang dari sidebar: menambah satu
 * tujuan cukup di satu tempat.
 */
export interface MitraNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const MITRA_MAIN_ITEMS: MitraNavItem[] = [
  { href: '/mitra/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/mitra/orders', label: 'Pesanan', icon: Package },
  { href: '/mitra/services', label: 'Layanan', icon: Wrench },
  { href: '/mitra/schedule', label: 'Jadwal', icon: CalendarDays },
  { href: '/mitra/chat', label: 'Chat', icon: MessageSquare },
  { href: '/mitra/reviews', label: 'Ulasan', icon: Star },
  { href: '/mitra/wallet', label: 'Keuangan', icon: Wallet },
];

export const MITRA_FOOTER_ITEMS: MitraNavItem[] = [
  { href: '/mitra/profile', label: 'Profil Bisnis', icon: User },
  { href: '/mitra/verification-status', label: 'Dokumen & Verifikasi', icon: ShieldCheck },
  { href: '/mitra/bantuan', label: 'Bantuan', icon: HelpCircle },
];
