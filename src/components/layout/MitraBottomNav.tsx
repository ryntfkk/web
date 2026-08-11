"use client";

import { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Package, MessageSquare, Settings, ClipboardCheck, Menu, RefreshCw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUnreadChatCount } from '@/hooks/useChatRooms';
import { Modal } from '@/components/ui/modal';
import { SwitchRoleModal } from '@/components/ui/switch-role-modal';
import { canAccess } from '@/lib/mitra-access';
import { MITRA_MAIN_ITEMS, MITRA_FOOTER_ITEMS, type MitraNavItem } from '@/lib/mitra-nav';
import type { PartnerApplicationStatus } from '@/hooks/usePartnerVerificationStatus';

// Tab utama (label sengaja pendek untuk bilah bawah). Sisa tujuan yang ada di
// sidebar dibuka lewat tab "Lainnya" . lihat audit A7.
const approvedPrimary = [
  { href: '/mitra/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/mitra/orders', label: 'Pesanan', icon: Package },
  { href: '/mitra/chat', label: 'Chat', icon: MessageSquare },
  { href: '/mitra/profile', label: 'Profil', icon: Settings },
];

// Mitra yang BELUM disetujui: hanya tujuan yang benar-benar bisa ia pakai (P1-10).
const pendingPrimary = [
  { href: '/mitra/verification-status', label: 'Status', icon: ClipboardCheck },
  { href: '/mitra/services', label: 'Layanan', icon: Package },
  { href: '/mitra/profile', label: 'Profil', icon: Settings },
];

export default function MitraBottomNav({
  verification,
}: {
  verification?: PartnerApplicationStatus;
}) {
  const pathname = usePathname();
  const unreadCount = useUnreadChatCount();
  const [showMore, setShowMore] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);

  const approved = verification === 'APPROVED';
  const primary = approved ? approvedPrimary : pendingPrimary;
  const primaryHrefs = new Set(primary.map((i) => i.href));

  // Tujuan "Lainnya" = seluruh menu sidebar yang boleh diakses TAPI belum ada di
  // bilah utama. Dihitung dari sumber yang sama dengan sidebar (canAccess), jadi
  // tak mungkin menyimpang dari desktop.
  const moreItems = [...MITRA_MAIN_ITEMS, ...MITRA_FOOTER_ITEMS].filter(
    (i) => canAccess(i.href, verification) && !primaryHrefs.has(i.href),
  );

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-gray-100 pb-safe z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {primary.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${
                  active ? 'text-brand-red' : 'text-brand-gray-400 hover:text-brand-gray-700'
                }`}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
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

          {/* Tab Lainnya: buka menu penuh (audit A7). Hanya bila memang ada
              tujuan tambahan yang bisa diakses . kalau tidak, bilahnya tetap
              seperti semula. */}
          {moreItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="flex flex-col items-center justify-center w-full h-full space-y-1 text-brand-gray-400 hover:text-brand-gray-700 transition-colors duration-200"
            >
              <Menu className="w-5 h-5" strokeWidth={2} />
              <span className="text-[12px] font-medium leading-none">Lainnya</span>
            </button>
          )}
        </div>
      </div>

      <Modal open={showMore} onClose={() => setShowMore(false)} title="Menu Mitra">
        <nav className="space-y-1">
          {moreItems.map((item: MitraNavItem) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-brand-red-light font-semibold text-brand-red'
                    : 'text-brand-gray-700 hover:bg-brand-gray-60 hover:text-brand-gray-900'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setShowMore(false);
              setShowSwitch(true);
            }}
            className="mt-1 flex w-full items-center gap-3 border-t border-brand-gray-100 px-3 pt-3 pb-1 text-sm text-brand-gray-700 transition-colors hover:text-brand-gray-900"
          >
            <RefreshCw className="h-5 w-5 shrink-0" />
            <span className="truncate">Beralih ke Pelanggan</span>
          </button>
        </nav>
      </Modal>

      <SwitchRoleModal isOpen={showSwitch} onClose={() => setShowSwitch(false)} />
    </>
  );
}
