"use client";

import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface MenuListItemProps {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  /** Render sebagai Link. Tepat salah satu dari href/onClick yang dipakai. */
  href?: string;
  onClick?: () => void;
  /** Angka di kanan baris; hanya dirender saat > 0. */
  badge?: number;
  /** Styling tab aktif (sidebar desktop): background merah muda, tanpa chevron. */
  active?: boolean;
}

export function MenuListItem({ icon: Icon, label, subtitle, href, onClick, badge, active = false }: MenuListItemProps) {
  const className = `w-full flex items-center p-4 transition-colors text-left ${
    active ? 'bg-[#fdf2f2]' : 'hover:bg-[#f7f5f4]'
  }`;

  const content = (
    <>
      <Icon className={`w-5 h-5 mr-3 shrink-0 ${active ? 'text-[#b51822]' : 'text-[#8f6f6d]'}`} />
      <div className="flex-1 min-w-0">
        <span className={`block text-sm font-medium ${active ? 'text-[#b51822]' : 'text-[#32201f]'}`}>{label}</span>
        {subtitle && <span className="text-xs text-[#8f6f6d]">{subtitle}</span>}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`text-xs px-2 py-0.5 rounded ${active ? 'bg-[#b51822] text-white' : 'bg-[#e5e2e1] text-[#5b403e]'}`}>
          {badge}
        </span>
      )}
      {!active && <ChevronRight className="w-5 h-5 text-[#d4c8c7] shrink-0" />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export function MenuCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden">
      <div className="p-4 border-b border-[#e5e2e1]">
        <h3 className="font-semibold text-[#32201f]">{title}</h3>
      </div>
      <div className="divide-y divide-[#e5e2e1]">{children}</div>
    </div>
  );
}
