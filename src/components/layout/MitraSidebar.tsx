'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RefreshCw, ClipboardCheck } from 'lucide-react';

import { useUnreadChatCount } from '@/hooks/useChatRooms';
import { canAccess } from '@/lib/mitra-access';
import { MITRA_MAIN_ITEMS, MITRA_FOOTER_ITEMS, type MitraNavItem } from '@/lib/mitra-nav';
import type { PartnerApplicationStatus } from '@/hooks/usePartnerVerificationStatus';
import { SwitchRoleModal } from '@/components/ui/switch-role-modal';

/**
 * Sidebar mode mitra untuk desktop (P1-13 / §5.2).
 *
 * Mode mitra sebelumnya memakai bottom navigation di semua ukuran layar, jadi
 * di desktop tampak seperti aplikasi ponsel yang diletakkan di tengah layar
 * lebar. Ruang desktop dipakai untuk NAVIGASI dan KONTEKS, bukan untuk
 * memperbesar objek.
 */

// Definisi menu dipindah ke `@/lib/mitra-nav` agar dipakai bersama
// MitraBottomNav (audit A7) . jangan definisikan ulang di sini.
const MAIN_ITEMS = MITRA_MAIN_ITEMS;
const FOOTER_ITEMS = MITRA_FOOTER_ITEMS;

interface Props {
  verification: PartnerApplicationStatus | undefined;
}

export default function MitraSidebar({ verification }: Props) {
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const pathname = usePathname();
  const unreadCount = useUnreadChatCount();
  const approved = verification === 'APPROVED';

  // Menu mengikuti matrix akses (P1-10): menawarkan tujuan yang pasti memantulkan
  // mitra kembali ke halaman status adalah jebakan, bukan navigasi.
  const mainItems = MAIN_ITEMS.filter((item) => canAccess(item.href, verification));

  const renderItem = (item: MitraNavItem) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-brand-red-light font-semibold text-brand-red'
            : 'text-brand-gray-700 hover:bg-brand-gray-60 hover:text-brand-gray-900'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
        <span className="truncate">{item.label}</span>
        {item.href === '/mitra/chat' && unreadCount > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1.5 text-[11px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    // z-30 = tangga z-index mode mitra (DEVELOPER_NOTES §UI mode mitra): di atas
    // header sticky halaman (z-10) dan konten yang menimpa hero (z-20), di bawah
    // bilah aksi (z-40) dan bottom nav (z-50). Tanpa z eksplisit urutannya cuma
    // urutan DOM, dan itu berubah diam-diam saat halaman menambah sticky baru.
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-brand-gray-100 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-brand-gray-100 px-4">
        <span className="text-base font-extrabold tracking-tight text-brand-red">POSKO</span>
        <span className="rounded bg-brand-red-light px-1.5 py-0.5 text-[10px] font-bold text-brand-red">
          MITRA
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {!approved && (
          <Link
            href="/mitra/verification-status"
            className="mb-2 flex items-start gap-2 rounded-md border border-brand-warning-border bg-brand-warning-soft p-2.5 text-xs text-brand-gray-700"
          >
            <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-warning-dark" />
            <span>
              <span className="block font-semibold text-brand-gray-900">
                {verification === 'REJECTED' ? 'Verifikasi ditolak' : 'Menunggu verifikasi'}
              </span>
              Sebagian menu terbuka setelah disetujui.
            </span>
          </Link>
        )}
        {mainItems.map(renderItem)}
      </nav>

      <div className="space-y-1 border-t border-brand-gray-100 p-3">
        {FOOTER_ITEMS.filter((item) => canAccess(item.href, verification)).map(renderItem)}
        <button
          onClick={() => setShowSwitchModal(true)}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-brand-gray-700 transition-colors hover:bg-brand-gray-60 hover:text-brand-gray-900"
        >
          <RefreshCw className="h-4 w-4 shrink-0" />
          <span className="truncate">Beralih ke Pelanggan</span>
        </button>
      </div>

      <SwitchRoleModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
      />
    </aside>
  );
}
