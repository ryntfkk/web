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
    active ? 'bg-brand-red-soft' : 'hover:bg-brand-gray-60'
  }`;

  const content = (
    <>
      <Icon className={`w-5 h-5 mr-3 shrink-0 ${active ? 'text-brand-red' : 'text-brand-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <span className={`block text-sm font-medium ${active ? 'text-brand-red' : 'text-brand-gray-800'}`}>{label}</span>
        {subtitle && <span className="text-xs text-brand-gray-400">{subtitle}</span>}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`text-xs px-2 py-0.5 rounded ${active ? 'bg-brand-red text-white' : 'bg-brand-gray-100 text-brand-gray-700'}`}>
          {badge}
        </span>
      )}
      {!active && <ChevronRight className="w-5 h-5 text-brand-gray-200 shrink-0" />}
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
    <div className="bg-white rounded border border-brand-gray-100 overflow-hidden">
      <div className="p-4 border-b border-brand-gray-100">
        <h3 className="font-semibold text-brand-gray-800">{title}</h3>
      </div>
      <div className="divide-y divide-brand-gray-100">{children}</div>
    </div>
  );
}
